import { NextRequest } from 'next/server';
import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Article } from '@/entities/Article';
import { Mouvement } from '@/entities/Mouvement';
import { UserRole } from '@/entities/User';
import { publishChange } from '@/lib/realtime';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (_request, auth, { params }) => {
  const tenantId = requireTenant(auth);
  const { id } = await params;
  const db = await getDb();
  const article = await db.getRepository(Article).findOne({ where: { id, tenant_id: tenantId } });
  if (!article) return Response.json({ message: 'Article introuvable' }, { status: 404 });
  return Response.json(article);
});

export const PUT = withAuth<Ctx>(async (request: NextRequest, auth, { params }) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
  const tenantId = requireTenant(auth);
  const { id } = await params;

  const db = await getDb();
  const repo = db.getRepository(Article);
  const article = await repo.findOne({ where: { id, tenant_id: tenantId } });
  if (!article) return Response.json({ message: 'Article introuvable' }, { status: 404 });

  const body = await request.json();
  Object.assign(article, body);
  // Ensure tenant_id cannot be overwritten via body
  article.tenant_id = tenantId;
  const updated = await repo.save(article);
  await publishChange(tenantId, 'article', 'update', updated);
  return Response.json(updated);
});

export const DELETE = withAuth<Ctx>(async (_request, auth, { params }) => {
  requireRole(auth, UserRole.ADMIN);
  const tenantId = requireTenant(auth);
  const { id } = await params;

  const db = await getDb();
  const article = await db.getRepository(Article).findOne({ where: { id, tenant_id: tenantId } });
  if (!article) return Response.json({ message: 'Article introuvable' }, { status: 404 });

  const mouvementsCount = await db.getRepository(Mouvement).count({
    where: { article: { id }, tenant_id: tenantId },
  });
  if (mouvementsCount > 0) {
    return Response.json({ message: 'Cet article a des mouvements associés', mouvementsCount }, { status: 409 });
  }

  await db.getRepository(Article).remove(article);
  await publishChange(tenantId, 'article', 'delete', { id });
  return Response.json({ message: 'Article supprimé' });
});
