import { NextRequest } from 'next/server';
import { requireAuth, requireTenant, AuthError } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Localisation } from '@/entities/Localisation';

type Context = { params: Promise<{ id: string }> };

async function resolve(request: NextRequest, context: Context) {
  const auth = requireAuth(request);
  const tenantId = requireTenant(auth);
  const { id } = await context.params;
  const db = await getDb();
  const localisation = await db.getRepository(Localisation).findOne({ where: { id, tenant_id: tenantId } });
  return { localisation, db };
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const { localisation } = await resolve(request, context);
    if (!localisation) return Response.json({ message: 'Localisation non trouvée' }, { status: 404 });
    return Response.json(localisation);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status });
    return Response.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const { localisation, db } = await resolve(request, context);
    if (!localisation) return Response.json({ message: 'Localisation non trouvée' }, { status: 404 });
    const body = await request.json();
    Object.assign(localisation, body);
    await db.getRepository(Localisation).save(localisation);
    return Response.json(localisation);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status });
    return Response.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { localisation, db } = await resolve(request, context);
    if (!localisation) return Response.json({ message: 'Localisation non trouvée' }, { status: 404 });
    await db.getRepository(Localisation).remove(localisation);
    return Response.json({ message: 'Localisation supprimée' });
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status });
    return Response.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
