import { NextRequest } from 'next/server';
import { requireAuth, requireTenant, AuthError } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Fournisseur } from '@/entities/Fournisseur';

type Context = { params: Promise<{ id: string }> };

async function resolve(request: NextRequest, context: Context) {
  const auth = requireAuth(request);
  const tenantId = requireTenant(auth);
  const { id } = await context.params;
  const db = await getDb();
  const fournisseur = await db.getRepository(Fournisseur).findOne({
    where: tenantId ? { id, tenant_id: tenantId } : { id },
  });
  return { fournisseur, db };
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const { fournisseur } = await resolve(request, context);
    if (!fournisseur) return Response.json({ message: 'Fournisseur non trouvé' }, { status: 404 });
    return Response.json(fournisseur);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status });
    return Response.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const { fournisseur, db } = await resolve(request, context);
    if (!fournisseur) return Response.json({ message: 'Fournisseur non trouvé' }, { status: 404 });
    const body = await request.json();
    Object.assign(fournisseur, body);
    await db.getRepository(Fournisseur).save(fournisseur);
    return Response.json(fournisseur);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status });
    return Response.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { fournisseur, db } = await resolve(request, context);
    if (!fournisseur) return Response.json({ message: 'Fournisseur non trouvé' }, { status: 404 });
    await db.getRepository(Fournisseur).remove(fournisseur);
    return Response.json({ message: 'Fournisseur supprimé' });
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status });
    return Response.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
