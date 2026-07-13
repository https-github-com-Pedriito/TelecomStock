import { NextRequest } from 'next/server';
import { withAuth, requireRole } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Tenant } from '@/entities/Tenant';
import { User, UserRole } from '@/entities/User';
import bcryptjs from 'bcryptjs';
import { sendTenantWelcomeEmail } from '@/lib/mailer';

export const GET = withAuth(async (_request, auth) => {
  requireRole(auth, UserRole.SUPER_ADMIN);
  const db = await getDb();
  const tenants = await db.getRepository(Tenant).find({ order: { created_at: 'DESC' } });
  return Response.json(tenants);
});

export const POST = withAuth(async (request, auth) => {
  requireRole(auth, UserRole.SUPER_ADMIN);
  const body = await request.json();
  const { nom, slug, contact_email, admin_nom, admin_prenom, admin_email } = body;

  if (!nom || !slug || !admin_email) {
    return Response.json({ message: 'nom, slug et admin_email sont requis' }, { status: 400 });
  }

  const db = await getDb();

  const existing = await db.getRepository(Tenant).findOne({ where: { slug } });
  if (existing) return Response.json({ message: 'Ce slug est déjà utilisé' }, { status: 409 });

  const tenant = db.getRepository(Tenant).create({ nom, slug, contact_email, is_active: true });
  await db.getRepository(Tenant).save(tenant);

  const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-4).toUpperCase() + '!';
  const password_hash = await bcryptjs.hash(tempPassword, 10);

  const admin = db.getRepository(User).create({
    tenant_id: tenant.id,
    email: admin_email,
    password_hash,
    nom: admin_nom || 'Admin',
    prenom: admin_prenom || nom,
    role: UserRole.ADMIN,
    is_active: true,
  });
  await db.getRepository(User).save(admin);

  try {
    await sendTenantWelcomeEmail(contact_email || admin_email, nom, admin_email, tempPassword);
  } catch (e) {
    console.error('Erreur envoi email bienvenue:', e);
  }

  const { password_hash: _, ...adminWithoutPwd } = admin;
  return Response.json({ tenant, admin: adminWithoutPwd, tempPassword }, { status: 201 });
});
