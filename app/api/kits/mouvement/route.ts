import { NextRequest } from 'next/server';
import { In } from 'typeorm';
import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Kit } from '@/entities/Kit';
import { Article } from '@/entities/Article';
import { Mouvement, MouvementType } from '@/entities/Mouvement';
import { UserRole } from '@/entities/User';
import { publishChange } from '@/lib/realtime';
import { notifyStockAlerts } from '@/lib/stockAlerts';
import {
  MAX_KITS_PAR_MOUVEMENT,
  checkKitAvailability,
  explodeKit,
  normalizeKitCode,
  type ManqueStock,
} from '@/lib/kits';

/** Abandon volontaire de la transaction quand le stock ne couvre pas la sortie. */
class StockInsuffisantError extends Error {
  constructor(readonly manques: ManqueStock[]) {
    super('STOCK_INSUFFISANT');
  }
}

/** Article inconnu ou appartenant a un autre tenant. */
class ArticleInconnuError extends Error {
  constructor(readonly articleId: string) {
    super('ARTICLE_INCONNU');
  }
}

/**
 * Enregistre l'entree ou la sortie de N kits.
 *
 * Le kit n'est pas stocke : il est eclate en sa nomenclature, et c'est le stock
 * de chaque composant qui bouge. Un mouvement est trace par composant, tous
 * porteurs du meme commentaire, pour que l'historique reste lisible.
 *
 * Toute la phase d'ecriture est dans une transaction, et les articles touches
 * sont verrouilles (SELECT ... FOR UPDATE) avant d'etre relus : sans cela, deux
 * sorties simultanees liraient le meme stock et l'une des deux deductions
 * serait perdue. C'est aussi ce qui garantit le tout-ou-rien annonce a
 * l'utilisateur, y compris si une ecriture echoue en cours de route.
 */
export const POST = withAuth(async (request: NextRequest, auth) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIEN);
  const tenantId = requireTenant(auth);
  if (!tenantId) return Response.json({ message: 'Aucun tenant sélectionné' }, { status: 403 });

  const body = await request.json();
  const { type, utilisateur, projet, technicien, commentaire } = body;
  const nbKits = Number(body?.quantite);

  if (!type || !utilisateur || (!body?.code && !body?.kit_id)) {
    return Response.json({ message: 'Champs requis manquants' }, { status: 400 });
  }
  if (!Object.values(MouvementType).includes(type)) {
    return Response.json({ message: 'Type de mouvement invalide' }, { status: 400 });
  }
  if (!Number.isInteger(nbKits) || nbKits <= 0) {
    return Response.json({ message: 'Le nombre de kits doit être un entier strictement positif' }, { status: 400 });
  }
  // Borne haute : les quantites eclatees sont ecrites dans des colonnes int4,
  // un nombre de kits delirant ferait echouer l'ecriture en 500 plutot qu'en 400.
  if (nbKits > MAX_KITS_PAR_MOUVEMENT) {
    return Response.json(
      { message: `Le nombre de kits ne peut pas dépasser ${MAX_KITS_PAR_MOUVEMENT}` },
      { status: 400 }
    );
  }

  // Forcer une sortie creuse le stock sous le reel : c'est une regularisation,
  // pas un geste d'exploitation courante.
  const force = Boolean(body?.force);
  if (force && auth.role !== UserRole.ADMIN && auth.role !== UserRole.MANAGER && auth.role !== UserRole.SUPER_ADMIN) {
    return Response.json(
      { message: 'Seuls un administrateur ou un manager peuvent forcer une sortie en stock insuffisant' },
      { status: 403 }
    );
  }

  const db = await getDb();
  const kit = await db.getRepository(Kit).findOne({
    where: body.kit_id
      ? { id: String(body.kit_id), tenant_id: tenantId }
      : { code: normalizeKitCode(body.code), tenant_id: tenantId },
    relations: { lignes: { article: true } },
  });

  if (!kit) return Response.json({ message: 'Kit introuvable' }, { status: 404 });
  if (!kit.est_actif) {
    return Response.json({ message: `Le kit ${kit.code} est désactivé` }, { status: 409 });
  }

  const lignes = kit.lignes ?? [];
  if (lignes.length === 0) {
    return Response.json({ message: `Le kit ${kit.code} n'a aucun composant` }, { status: 409 });
  }

  const aDeduire = explodeKit(lignes, nbKits);
  const libelleKit = `${nbKits} × ${kit.code} (${kit.nom})`;
  const commentaireFinal = commentaire
    ? `${commentaire} — ${libelleKit}`
    : `${type === MouvementType.SORTIE ? 'Sortie' : 'Entrée'} kit : ${libelleKit}`;

  let resultat: { mouvements: Mouvement[]; articles: Article[] };
  try {
    resultat = await db.transaction(async manager => {
      const articleRepo = manager.getRepository(Article);
      const mouvementRepo = manager.getRepository(Mouvement);

      // Verrou d'ecriture : les lignes restent bloquees jusqu'au commit, donc
      // une sortie concurrente attend au lieu d'ecraser notre deduction.
      const articles = await articleRepo.find({
        where: { id: In(aDeduire.map(l => l.article_id)), tenant_id: tenantId },
        lock: { mode: 'pessimistic_write' },
      });
      const articlesById = new Map(articles.map(a => [a.id, a]));

      const inconnu = aDeduire.find(l => !articlesById.has(l.article_id));
      if (inconnu) throw new ArticleInconnuError(inconnu.article_id);

      if (type === MouvementType.SORTIE && !force) {
        const manques = checkKitAvailability(aDeduire, articlesById);
        if (manques.length > 0) throw new StockInsuffisantError(manques);
      }

      const aSauver: Article[] = [];
      const mouvementsACreer: Mouvement[] = [];

      for (const ligne of aDeduire) {
        const article = articlesById.get(ligne.article_id)!;
        article.quantite_stock =
          type === MouvementType.SORTIE
            ? Math.max(0, (article.quantite_stock ?? 0) - ligne.quantite)
            : (article.quantite_stock ?? 0) + ligne.quantite;
        aSauver.push(article);

        mouvementsACreer.push(
          mouvementRepo.create({
            tenant_id: tenantId,
            article,
            type,
            quantite: ligne.quantite,
            utilisateur,
            projet,
            technicien,
            commentaire: commentaireFinal,
          })
        );
      }

      // Deux ecritures groupees plutot que 2N aller-retours.
      const articlesSauves = await articleRepo.save(aSauver);
      const mouvements = await mouvementRepo.save(mouvementsACreer);
      return { articles: articlesSauves, mouvements };
    });
  } catch (err) {
    if (err instanceof StockInsuffisantError) {
      return Response.json(
        {
          message: `Stock insuffisant pour ${nbKits} × ${kit.code}`,
          code: 'STOCK_INSUFFISANT',
          manques: err.manques,
        },
        { status: 409 }
      );
    }
    if (err instanceof ArticleInconnuError) {
      return Response.json(
        { message: `Article inconnu dans la nomenclature : ${err.articleId}` },
        { status: 400 }
      );
    }
    throw err;
  }

  // Hors transaction : ni la diffusion temps reel ni l'e-mail ne doivent
  // pouvoir annuler un mouvement deja valide.
  await Promise.all([
    publishChange(tenantId, 'mouvement', 'create', resultat.mouvements),
    publishChange(tenantId, 'article', 'update', resultat.articles),
  ]);

  await notifyStockAlerts(db, tenantId, resultat.articles);

  return Response.json(
    {
      kit: { id: kit.id, code: kit.code, nom: kit.nom },
      nb_kits: nbKits,
      type,
      mouvements: resultat.mouvements,
      articles: resultat.articles,
    },
    { status: 201 }
  );
});
