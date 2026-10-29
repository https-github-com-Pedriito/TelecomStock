import { withAuth, requireRole } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Tenant } from '@/entities/Tenant';
import { User, UserRole } from '@/entities/User';
import { parseAlertEmails } from '@/lib/alertEmails';

export const GET = withAuth(async (_request, auth) => {
  requireRole(auth, UserRole.ADMIN, UserRole.SUPER_ADMIN);
  if (!auth.tenantId) {
    return Response.json({ message: 'Aucun tenant associé' }, { status: 404 });
  }

  const db = await getDb();
  const tenant = await db.getRepository(Tenant).findOne({ where: { id: auth.tenantId } });
  if (!tenant) {
    return Response.json({ message: 'Tenant introuvable' }, { status: 404 });
  }

  const activeUsers = await db.getRepository(User).count({
    where: { tenant_id: auth.tenantId, is_active: true },
  });

  return Response.json({
    nom: tenant.nom,
    plan: tenant.plan,
    seats: tenant.seats,
    activeUsers,
    subscription_status: tenant.subscription_status,
    is_active: tenant.is_active,
    alert_emails: tenant.alert_emails ?? [],
  });
});

export const PUT = withAuth(async (request, auth) => {
  requireRole(auth, UserRole.ADMIN, UserRole.SUPER_ADMIN);
  if (!auth.tenantId) {
    return Response.json({ message: 'Aucun tenant associé' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseAlertEmails(body?.alert_emails);
  if (!parsed.ok) {
    return Response.json({ message: parsed.message }, { status: 400 });
  }

  const db = await getDb();
  const repo = db.getRepository(Tenant);
  const tenant = await repo.findOne({ where: { id: auth.tenantId } });
  if (!tenant) {
    return Response.json({ message: 'Tenant introuvable' }, { status: 404 });
  }

  tenant.alert_emails = parsed.emails;
  await repo.save(tenant);
  return Response.json({ alert_emails: parsed.emails });
});
