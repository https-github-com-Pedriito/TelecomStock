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
import { checkKitAvailability, explodeKit, normalizeKitCode } from '@/lib/kits';

/**
 * Enregistre l'entrée ou la sortie de N kits.
 *
 * Le kit n'est pas stocké : il est éclaté en sa nomenclature, et c'est le stock
 * de chaque composant qui bouge. Un mouvement est tracé par composant, tous
 * porteurs du même commentaire, pour que l'historique reste lisible.
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

  const db = await getDb();
  const kitRepo = db.getRepository(Kit);
  const kit = await kitRepo.findOne({
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

  const articleRepo = db.getRepository(Article);
  const articles = await articleRepo.find({
    where: { id: In(aDeduire.map(l => l.article_id)), tenant_id: tenantId },
  });
  const articlesById = new Map(articles.map(a => [a.id, a]));

  // Tout ou rien : on refuse une sortie que le stock ne couvre pas plutôt que
  // de décrémenter une partie des composants et de laisser un kit à moitié sorti.
  if (type === MouvementType.SORTIE) {
    const manques = checkKitAvailability(aDeduire, articlesById as any);
    if (manques.length > 0 && !body.force) {
      return Response.json(
        {
          message: `Stock insuffisant pour ${nbKits} × ${kit.code}`,
          code: 'STOCK_INSUFFISANT',
          manques,
        },
        { status: 409 }
      );
    }
  } else {
    const inconnu = aDeduire.find(l => !articlesById.has(l.article_id));
    if (inconnu) {
      return Response.json({ message: `Article inconnu dans la nomenclature : ${inconnu.article_id}` }, { status: 400 });
    }
  }

  const libelleKit = `${nbKits} × ${kit.code} (${kit.nom})`;
  const commentaireFinal = commentaire
    ? `${commentaire} — ${libelleKit}`
    : `${type === MouvementType.SORTIE ? 'Sortie' : 'Entrée'} kit : ${libelleKit}`;

  const mouvementRepo = db.getRepository(Mouvement);
  const mouvements: Mouvement[] = [];
  const articlesTouches: Article[] = [];

  for (const ligne of aDeduire) {
    const article = articlesById.get(ligne.article_id);
    if (!article) continue;

    if (type === MouvementType.SORTIE) {
      article.quantite_stock = Math.max(0, (article.quantite_stock ?? 0) - ligne.quantite);
    } else {
      article.quantite_stock = (article.quantite_stock ?? 0) + ligne.quantite;
    }
    const articleSauve = await articleRepo.save(article);
    articlesTouches.push(articleSauve);

    const mouvement = await mouvementRepo.save(
      mouvementRepo.create({
        tenant_id: tenantId,
        article: articleSauve,
        type,
        quantite: ligne.quantite,
        utilisateur,
        projet,
        technicien,
        commentaire: commentaireFinal,
      })
    );
    mouvements.push(mouvement);
  }

  await Promise.all([
    publishChange(tenantId, 'mouvement', 'create', mouvements),
    publishChange(tenantId, 'article', 'update', articlesTouches),
  ]);

  await notifyStockAlerts(db, tenantId, articlesTouches);

  return Response.json(
    {
      kit: { id: kit.id, code: kit.code, nom: kit.nom },
      nb_kits: nbKits,
      type,
      mouvements,
      articles: articlesTouches,
    },
    { status: 201 }
  );
});
