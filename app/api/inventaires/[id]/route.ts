import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Inventaire } from '@/entities/Inventaire';
import { UserRole } from '@/entities/User';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (_request, auth, { params }) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
  const tenantId = requireTenant(auth);
  const { id } = await params;
  const db = await getDb();
  const inventaire = await db.getRepository(Inventaire).findOne({
    where: { id, tenant_id: tenantId },
    relations: { created_by: true, finalized_by: true },
  });
  if (!inventaire) return Response.json({ message: 'Inventaire introuvable' }, { status: 404 });
  return Response.json(inventaire);
});

export const DELETE = withAuth<Ctx>(async (_request, auth, { params }) => {
  requireRole(auth, UserRole.ADMIN);
  const tenantId = requireTenant(auth);
  const { id } = await params;
  const db = await getDb();
  const inventaire = await db.getRepository(Inventaire).findOne({ where: { id, tenant_id: tenantId } });
  if (!inventaire) return Response.json({ message: 'Inventaire introuvable' }, { status: 404 });
  await db.getRepository(Inventaire).remove(inventaire);
  return Response.json({ message: 'Inventaire supprimé' });
});
