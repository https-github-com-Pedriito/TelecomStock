import { NextRequest } from 'next/server';
import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Inventaire } from '@/entities/Inventaire';
import { UserRole } from '@/entities/User';

export const GET = withAuth(async (_request, auth) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
  const tenantId = requireTenant(auth);
  const db = await getDb();
  const inventaires = await db.getRepository(Inventaire).find({
    where: tenantId ? { tenant_id: tenantId } : {},
    relations: { created_by: true, finalized_by: true },
    order: { created_at: 'DESC' },
  });
  return Response.json(inventaires);
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
  const tenantId = requireTenant(auth);
  if (!tenantId) return Response.json({ message: 'Aucun tenant sélectionné' }, { status: 403 });
  const body = await request.json();
  const { nom, description, mois, annee } = body;
  if (!nom || !description || !mois || !annee) {
    return Response.json({ message: 'Champs requis manquants' }, { status: 400 });
  }
  const db = await getDb();
  const inventaire = db.getRepository(Inventaire).create({
    tenant_id: tenantId,
    nom,
    description,
    mois: Number(mois),
    annee: Number(annee),
    created_by_user_id: auth.userId,
  });
  const saved = await db.getRepository(Inventaire).save(inventaire);
  return Response.json(saved, { status: 201 });
});
