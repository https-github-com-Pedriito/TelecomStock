import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { InventaireEntry } from '@/entities/InventaireEntry';
import { UserRole } from '@/entities/User';

type Ctx = { params: Promise<{ id: string; entryId: string }> };

export const DELETE = withAuth<Ctx>(async (_request, auth, { params }) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
  const tenantId = requireTenant(auth);
  const { id, entryId } = await params;
  const db = await getDb();
  const entry = await db.getRepository(InventaireEntry).findOne({
    where: tenantId
      ? { id: entryId, inventaire_id: id, tenant_id: tenantId }
      : { id: entryId, inventaire_id: id },
  });
  if (!entry) return Response.json({ message: 'Entrée introuvable' }, { status: 404 });
  await db.getRepository(InventaireEntry).remove(entry);
  return Response.json({ message: 'Entrée supprimée' });
});
