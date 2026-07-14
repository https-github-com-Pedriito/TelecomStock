import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Inventaire, InventoryStatus } from '@/entities/Inventaire';
import { UserRole } from '@/entities/User';

export const GET = withAuth(async (_request, auth) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
  const tenantId = requireTenant(auth);
  const db = await getDb();
  const inventaire = await db.getRepository(Inventaire).findOne({
    where: tenantId
      ? { tenant_id: tenantId, statut: InventoryStatus.EN_COURS }
      : { statut: InventoryStatus.EN_COURS },
    relations: { created_by: true },
    order: { created_at: 'DESC' },
  });
  if (!inventaire) return Response.json(null);
  return Response.json(inventaire);
});
