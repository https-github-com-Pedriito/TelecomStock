import { NextRequest } from 'next/server';
import { withAuth, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Fournisseur } from '@/entities/Fournisseur';

export const GET = withAuth(async (_request, auth) => {
  const tenantId = requireTenant(auth);
  const db = await getDb();
  const fournisseurs = await db.getRepository(Fournisseur).find({ where: { tenant_id: tenantId } });
  return Response.json(fournisseurs);
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  const tenantId = requireTenant(auth);
  const body = await request.json();
  const { nom, contact, email, telephone, adresse } = body;
  if (!nom) return Response.json({ message: 'Le nom est requis' }, { status: 400 });

  const db = await getDb();
  const repo = db.getRepository(Fournisseur);
  const fournisseur = repo.create({ tenant_id: tenantId, nom, contact, email, telephone, adresse });
  await repo.save(fournisseur);
  return Response.json(fournisseur, { status: 201 });
});
