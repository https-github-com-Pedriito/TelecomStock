import { NextRequest } from 'next/server';
import { In } from 'typeorm';
import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Article } from '@/entities/Article';
import { Mouvement } from '@/entities/Mouvement';
import { KitLigne } from '@/entities/KitLigne';
import { Kit } from '@/entities/Kit';
import { UserRole } from '@/entities/User';
import { publishChange } from '@/lib/realtime';

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

export const PUT = withAuth<Ctx>(async (request: NextRequest, auth, { params }) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
  const tenantId = requireTenant(auth);
  const { id } = await params;

  const db = await getDb();
  const repo = db.getRepository(Article);
  const article = await repo.findOne({ where: tenantId ? { id, tenant_id: tenantId } : { id } });
  if (!article) return Response.json({ message: 'Article introuvable' }, { status: 404 });

  const body = await request.json();
  Object.assign(article, body);
  if (tenantId) article.tenant_id = tenantId;
  const updated = await repo.save(article);
  await publishChange(tenantId ?? article.tenant_id, 'article', 'update', updated);
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
  await publishChange(tenantId ?? articleTenantId, 'article', 'delete', { id });
  return Response.json({ message: 'Article supprimé' });
});
