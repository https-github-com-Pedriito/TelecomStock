import { withAuth, requireRole } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { User, UserRole } from '@/entities/User';
import { Tenant } from '@/entities/Tenant';

export const GET = withAuth(async (_request, auth) => {
  requireRole(auth, UserRole.SUPER_ADMIN);

  const db = await getDb();
  const users = await db.getRepository(User).find({ order: { created_at: 'DESC' } });
  const tenants = await db.getRepository(Tenant).find();
  const tenantNameById = new Map(tenants.map(t => [t.id, t.nom]));

  return Response.json(
    users.map(({ password_hash: _, ...u }) => ({
      ...u,
      tenant_nom: u.tenant_id ? tenantNameById.get(u.tenant_id) ?? null : null,
    }))
  );
});
