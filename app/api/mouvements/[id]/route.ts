import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Mouvement } from '@/entities/Mouvement';
import { UserRole } from '@/entities/User';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (_request, auth, { params }) => {
  const tenantId = requireTenant(auth);
  const { id } = await params;
  const db = await getDb();
  const mouvement = await db.getRepository(Mouvement).findOne({
    where: tenantId ? { id, tenant_id: tenantId } : { id },
    relations: { article: true },
  });
  if (!mouvement) return Response.json({ message: 'Mouvement introuvable' }, { status: 404 });
  return Response.json(mouvement);
});

export const DELETE = withAuth<Ctx>(async (_request, auth, { params }) => {
  requireRole(auth, UserRole.ADMIN);
  const tenantId = requireTenant(auth);
  const { id } = await params;
  const db = await getDb();
  const mouvement = await db.getRepository(Mouvement).findOne({
    where: tenantId ? { id, tenant_id: tenantId } : { id },
  });
  if (!mouvement) return Response.json({ message: 'Mouvement introuvable' }, { status: 404 });
  await db.getRepository(Mouvement).remove(mouvement);
  return Response.json({ message: 'Mouvement supprimé' });
});
