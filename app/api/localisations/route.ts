import { NextRequest } from 'next/server';
import { withAuth, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Localisation } from '@/entities/Localisation';

export const GET = withAuth(async (_request, auth) => {
  const tenantId = requireTenant(auth);
  const db = await getDb();
  const localisations = await db.getRepository(Localisation).find({ where: { tenant_id: tenantId } });
  return Response.json(localisations);
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  const tenantId = requireTenant(auth);
  const body = await request.json();
  const { nom, description, type } = body;
  if (!nom) return Response.json({ message: 'Le nom est requis' }, { status: 400 });

  const db = await getDb();
  const repo = db.getRepository(Localisation);
  const localisation = repo.create({ tenant_id: tenantId, nom, description, type });
  await repo.save(localisation);
  return Response.json(localisation, { status: 201 });
});
