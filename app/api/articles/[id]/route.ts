import { NextRequest } from 'next/server';
import { In } from 'typeorm';
import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Article } from '@/entities/Article';
import { Mouvement, MouvementType } from '@/entities/Mouvement';
import { KitLigne } from '@/entities/KitLigne';
import { Kit } from '@/entities/Kit';
import { UserRole } from '@/entities/User';
import { publishChange } from '@/lib/realtime';
import { notifyStockAlerts } from '@/lib/stockAlerts';
import { runAfterResponse } from '@/lib/background';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (_request, auth, { params }) => {
  const tenantId = requireTenant(auth);
  const { id } = await params;
  const db = await getDb();
  const article = await db.getRepository(Article).findOne({
    where: tenantId ? { id, tenant_id: tenantId } : { id },
  });
  if (!article) return Response.json({ message: 'Article introuvable' }, { status: 404 });
  return Response.json(article);
});

const TEXT_FIELDS = ['categorie', 'fournisseur', 'localisation', 'image_url'] as const;

type ParsedArticleUpdate = {
  nom?: string;
  seuil_minimum?: number;
  quantite_stock?: number;
  prix_unitaire?: number | null;
  code_barres?: string | null;
  texts: Partial<Record<(typeof TEXT_FIELDS)[number], string | null>>;
};

/**
 * Ne retient que les champs modifiables et les valide. Avant, `Object.assign`
 * recopiait tout le corps (id, tenant, dates...) et acceptait par exemple un
 * stock negatif ou une chaine a la place d'un nombre.
 */
function parseArticleUpdate(body: unknown): ParsedArticleUpdate | string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Corps de requête invalide';
  const input = body as Record<string, unknown>;
  const out: ParsedArticleUpdate = { texts: {} };

  if (input.nom !== undefined) {
    if (typeof input.nom !== 'string' || input.nom.trim() === '') return 'Le nom est requis';
    out.nom = input.nom;
  }
  for (const field of ['quantite_stock', 'seuil_minimum'] as const) {
    if (input[field] === undefined) continue;
    const value = Number(input[field]);
    if (!Number.isInteger(value) || value < 0) return `${field} doit être un entier positif ou nul`;
    out[field] = value;
  }
  if (input.prix_unitaire !== undefined) {
    if (input.prix_unitaire === null || input.prix_unitaire === '') {
      out.prix_unitaire = null;
    } else {
      const value = Number(input.prix_unitaire);
      if (!Number.isFinite(value) || value < 0) return 'prix_unitaire invalide';
      out.prix_unitaire = value;
    }
  }
  if (input.code_barres !== undefined) {
    if (input.code_barres !== null && typeof input.code_barres !== 'string') return 'code_barres invalide';
    // Chaine vide = pas de code : l'index unique ne porte que sur les codes renseignes.
    out.code_barres = input.code_barres ? input.code_barres : null;
  }
  for (const field of TEXT_FIELDS) {
    const value = input[field];
    if (value === undefined) continue;
    if (value !== null && typeof value !== 'string') return `${field} invalide`;
    out.texts[field] = value;
  }
  return out;
}

export const PUT = withAuth<Ctx>(async (request: NextRequest, auth, { params }) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
  const tenantId = requireTenant(auth);
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Corps de requête invalide' }, { status: 400 });
  }
  const parsed = parseArticleUpdate(body);
  if (typeof parsed === 'string') return Response.json({ message: parsed }, { status: 400 });

  const db = await getDb();

  // Lecture, modification et mouvement dans une seule transaction, sur la ligne
  // verrouillee : deux editions simultanees ne s'ecrasent plus, et le mouvement
  // d'ajustement est cree ici, une seule fois, plutot que par un second appel du
  // navigateur (qui doublait le stock quand les deux appels partaient).
  const result = await db.transaction(async manager => {
    const repo = manager.getRepository(Article);
    const article = await repo.findOne({
      where: tenantId ? { id, tenant_id: tenantId } : { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!article) return null;

    const ancienneQuantite = article.quantite_stock ?? 0;
    const { texts, ...fields } = parsed;
    Object.assign(article, fields, texts);
    if (tenantId) article.tenant_id = tenantId;
    const updated = await repo.save(article);

    const difference = (updated.quantite_stock ?? 0) - ancienneQuantite;
    let mouvement: Mouvement | null = null;
    if (difference !== 0) {
      const utilisateur =
        [auth.prenom, auth.nom].filter(Boolean).join(' ').trim() || auth.email || 'Utilisateur inconnu';
      mouvement = await manager.getRepository(Mouvement).save(
        manager.getRepository(Mouvement).create({
          tenant_id: updated.tenant_id,
          article: updated,
          type: difference > 0 ? MouvementType.ENTREE : MouvementType.SORTIE,
          quantite: Math.abs(difference),
          utilisateur,
          commentaire: `Ajustement de stock: ${ancienneQuantite} → ${updated.quantite_stock}`,
        })
      );
    }
    return { updated, mouvement };
  });

  if (!result) return Response.json({ message: 'Article introuvable' }, { status: 404 });
  const { updated, mouvement } = result;

  // La reponse part tout de suite ; diffusion temps reel et alertes e-mail
  // suivent sans allonger le temps d'attente de l'utilisateur.
  await runAfterResponse(async () => {
    const publications = [publishChange(tenantId ?? updated.tenant_id, 'article', 'update', updated)];
    if (mouvement) publications.push(publishChange(updated.tenant_id, 'mouvement', 'create', mouvement));
    await Promise.all(publications);
    if (mouvement) await notifyStockAlerts(db, updated.tenant_id, [updated]);
  });

  return Response.json(updated);
});

export const DELETE = withAuth<Ctx>(async (request: NextRequest, auth, { params }) => {
  requireRole(auth, UserRole.ADMIN);
  const tenantId = requireTenant(auth);
  const { id } = await params;
  const force = new URL(request.url).searchParams.get('force') === 'true';

  const db = await getDb();
  const article = await db.getRepository(Article).findOne({
    where: tenantId ? { id, tenant_id: tenantId } : { id },
  });
  if (!article) return Response.json({ message: 'Article introuvable' }, { status: 404 });

  // kit_lignes.article_id est en ON DELETE CASCADE : sans ce garde-fou, la
  // suppression retirerait l'article de toutes les nomenclatures sans rien
  // dire, et les kits concernes continueraient d'etre scannes en deduisant un
  // composant de moins — un stock faux, sans trace.
  const lignesKit = await db.getRepository(KitLigne).find({ where: { article_id: id } });
  if (lignesKit.length > 0) {
    const kits = await db.getRepository(Kit).find({
      where: { id: In(lignesKit.map(l => l.kit_id)) },
    });
    const kitsConcernes = kits
      .filter(k => !tenantId || k.tenant_id === tenantId)
      .map(k => ({ id: k.id, code: k.code, nom: k.nom }));

    if (kitsConcernes.length > 0 && !force) {
      return Response.json(
        {
          message: `Cet article fait partie de ${kitsConcernes.length} kit(s)`,
          code: 'ARTICLE_UTILISE_PAR_KIT',
          kits: kitsConcernes,
        },
        { status: 409 }
      );
    }
  }

  const mouvementsWhere = tenantId ? { article: { id }, tenant_id: tenantId } : { article: { id } };
  const mouvementsCount = await db.getRepository(Mouvement).count({ where: mouvementsWhere });
  if (mouvementsCount > 0) {
    if (!force) {
      return Response.json({ message: 'Cet article a des mouvements associés', mouvementsCount }, { status: 409 });
    }
    await db.getRepository(Mouvement).delete(mouvementsWhere);
  }

  const articleTenantId = article.tenant_id;
  await db.getRepository(Article).remove(article);
  await runAfterResponse(() => publishChange(tenantId ?? articleTenantId, 'article', 'delete', { id }));
  return Response.json({ message: 'Article supprimé' });
});
