import bcryptjs from 'bcryptjs';
import { withAuth, requireRole } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { User, UserRole } from '@/entities/User';
import { Tenant } from '@/entities/Tenant';
import { sendTeamMemberWelcomeEmail } from '@/lib/mailer';
import { hasSeatAvailable } from '@/lib/seats';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (_request, auth, { params }) => {
  requireRole(auth, UserRole.SUPER_ADMIN);
  const { id: tenantId } = await params;

  const db = await getDb();
  const tenant = await db.getRepository(Tenant).findOne({ where: { id: tenantId } });
  if (!tenant) return Response.json({ message: 'Tenant introuvable' }, { status: 404 });

  const users = await db.getRepository(User).find({
    where: { tenant_id: tenantId },
    order: { created_at: 'ASC' },
  });

  return Response.json({
    tenant: { id: tenant.id, nom: tenant.nom, seats: tenant.seats, plan: tenant.plan },
    users: users.map(({ password_hash: _, ...u }) => u),
  });
});

export const POST = withAuth<Ctx>(async (request, auth, { params }) => {
  requireRole(auth, UserRole.SUPER_ADMIN);
  const { id: tenantId } = await params;

  const db = await getDb();
  const tenant = await db.getRepository(Tenant).findOne({ where: { id: tenantId } });
  if (!tenant) return Response.json({ message: 'Tenant introuvable' }, { status: 404 });

  const { nom, prenom, email, role, is_active } = await request.json();
  if (!nom || !prenom || !email || !role) {
    return Response.json({ message: 'nom, prenom, email et role sont requis' }, { status: 400 });
  }

  const repo = db.getRepository(User);
  const existing = await repo.findOne({ where: { email, tenant_id: tenantId } });
  if (existing) {
    return Response.json({ message: 'Un utilisateur avec cet email existe déjà' }, { status: 409 });
  }

  const activeCount = await repo.count({ where: { tenant_id: tenantId, is_active: true } });
  if (!hasSeatAvailable(activeCount, tenant.seats)) {
    return Response.json(
      { message: `Limite de ${tenant.seats} utilisateur(s) atteinte pour cet abonnement` },
      { status: 403 }
    );
  }

  const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-2).toUpperCase() + '!';
  const password_hash = await bcryptjs.hash(tempPassword, 10);

  const user = repo.create({
    tenant_id: tenantId,
    nom,
    prenom,
    email,
    role,
    is_active: is_active ?? true,
    password_hash,
  });
  await repo.save(user);

  try {
    await sendTeamMemberWelcomeEmail(email, tenant.nom, tempPassword);
  } catch (e) {
    console.error('Erreur envoi email nouvel utilisateur:', e);
  }

  const { password_hash: _, ...userWithoutPassword } = user;
  return Response.json({ ...userWithoutPassword, tempPassword }, { status: 201 });
});
