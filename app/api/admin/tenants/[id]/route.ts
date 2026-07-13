import { NextRequest } from 'next/server';
import { withAuth, requireRole } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Tenant } from '@/entities/Tenant';
import { UserRole } from '@/entities/User';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (_request, auth, { params }) => {
  requireRole(auth, UserRole.SUPER_ADMIN);
  const { id } = await params;
  const db = await getDb();
  const tenant = await db.getRepository(Tenant).findOne({ where: { id } });
  if (!tenant) return Response.json({ message: 'Tenant introuvable' }, { status: 404 });
  return Response.json(tenant);
});

export const PUT = withAuth<Ctx>(async (request, auth, { params }) => {
  requireRole(auth, UserRole.SUPER_ADMIN);
  const { id } = await params;
  const db = await getDb();
  const tenant = await db.getRepository(Tenant).findOne({ where: { id } });
  if (!tenant) return Response.json({ message: 'Tenant introuvable' }, { status: 404 });
  const body = await request.json();
  const { nom, is_active, contact_email } = body;
  if (nom !== undefined) tenant.nom = nom;
  if (is_active !== undefined) tenant.is_active = is_active;
  if (contact_email !== undefined) tenant.contact_email = contact_email;
  await db.getRepository(Tenant).save(tenant);
  return Response.json(tenant);
});
