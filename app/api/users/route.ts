import { NextRequest } from 'next/server';
import bcryptjs from 'bcryptjs';
import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { User, UserRole } from '@/entities/User';

export const GET = withAuth(async (_request, auth) => {
  requireRole(auth, UserRole.ADMIN, UserRole.SUPER_ADMIN);
  const tenantId = requireTenant(auth);

  const db = await getDb();
  const users = await db.getRepository(User).find({
    where: tenantId ? { tenant_id: tenantId } : {},
  });

  return Response.json(users.map(({ password_hash: _, ...u }) => u));
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  requireRole(auth, UserRole.ADMIN, UserRole.SUPER_ADMIN);
  const tenantId = requireTenant(auth);
  if (!tenantId) return Response.json({ message: 'Aucun tenant sélectionné' }, { status: 403 });

  const { nom, prenom, email, role, is_active } = await request.json();
  if (!nom || !prenom || !email || !role) {
    return Response.json({ message: 'nom, prenom, email et role sont requis' }, { status: 400 });
  }

  const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-2).toUpperCase() + '!';
  const password_hash = await bcryptjs.hash(tempPassword, 10);

  const db = await getDb();
  const repo = db.getRepository(User);

  const existing = await repo.findOne({ where: { email, tenant_id: tenantId } });
  if (existing) {
    return Response.json({ message: 'Un utilisateur avec cet email existe déjà' }, { status: 409 });
  }

  const user = repo.create({ tenant_id: tenantId, nom, prenom, email, role, is_active: is_active ?? true, password_hash });
  await repo.save(user);

  const { password_hash: _, ...userWithoutPassword } = user;
  return Response.json({ ...userWithoutPassword, tempPassword }, { status: 201 });
});
