import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Inventaire, InventoryStatus } from '@/entities/Inventaire';
import { UserRole } from '@/entities/User';

type Ctx = { params: Promise<{ id: string }> };

export const PUT = withAuth<Ctx>(async (_request, auth, { params }) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
  const tenantId = requireTenant(auth);
  const { id } = await params;
  const db = await getDb();
  const repo = db.getRepository(Inventaire);
  const inventaire = await repo.findOne({ where: tenantId ? { id, tenant_id: tenantId } : { id } });
  if (!inventaire) return Response.json({ message: 'Inventaire introuvable' }, { status: 404 });
  if (inventaire.statut !== InventoryStatus.EN_COURS) {
    return Response.json({ message: 'Inventaire déjà finalisé' }, { status: 409 });
  }
  inventaire.statut = InventoryStatus.FINALISE;
  inventaire.finalized_by_user_id = auth.userId;
  inventaire.finalized_at = new Date();
  const updated = await repo.save(inventaire);
  return Response.json(updated);
});
