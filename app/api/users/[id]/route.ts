import { NextRequest } from 'next/server';
import bcryptjs from 'bcryptjs';
import { requireAuth, requireRole, requireTenant, AuthError } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { User, UserRole } from '@/entities/User';
import { Tenant } from '@/entities/Tenant';
import { hasSeatAvailable } from '@/lib/seats';

type Context = { params: Promise<{ id: string }> };

async function resolveUser(request: NextRequest, context: Context) {
  const auth = requireAuth(request);
  requireRole(auth, UserRole.ADMIN, UserRole.SUPER_ADMIN);
  const tenantId = requireTenant(auth);
  const { id } = await context.params;
  const db = await getDb();
  const user = await db.getRepository(User).findOne({
    where: tenantId ? { id, tenant_id: tenantId } : { id },
  });
  return { auth, tenantId, user, db, id };
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const { user } = await resolveUser(request, context);
    if (!user) return Response.json({ message: 'Utilisateur non trouvé' }, { status: 404 });
    const { password_hash: _, ...u } = user;
    return Response.json(u);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status });
    return Response.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const { auth, user, db } = await resolveUser(request, context);
    if (!user) return Response.json({ message: 'Utilisateur non trouvé' }, { status: 404 });

    const body = await request.json();
    const { nom, prenom, email, role, is_active, password, tenant_id } = body;

    if (nom !== undefined) user.nom = nom;
    if (prenom !== undefined) user.prenom = prenom;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (is_active !== undefined) user.is_active = is_active;
    if (password) user.password_hash = await bcryptjs.hash(password, 10);

    if (tenant_id !== undefined) {
      if (auth.role !== UserRole.SUPER_ADMIN) {
        return Response.json({ message: 'Action réservée au SUPER_ADMIN' }, { status: 403 });
      }
      if (tenant_id !== null) {
        const targetTenant = await db.getRepository(Tenant).findOne({ where: { id: tenant_id } });
        if (!targetTenant) return Response.json({ message: 'Tenant cible introuvable' }, { status: 404 });
        const activeCount = await db.getRepository(User).count({ where: { tenant_id, is_active: true } });
        if ((is_active ?? user.is_active) && !hasSeatAvailable(activeCount, targetTenant.seats)) {
          return Response.json(
            { message: `Limite de ${targetTenant.seats} utilisateur(s) atteinte pour ce tenant` },
            { status: 403 }
          );
        }
      }
      user.tenant_id = tenant_id;
    }

    await db.getRepository(User).save(user);
    const { password_hash: _, ...u } = user;
    return Response.json(u);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status });
    return Response.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { auth, user, db, id } = await resolveUser(request, context);
    if (!user) return Response.json({ message: 'Utilisateur non trouvé' }, { status: 404 });
    if (auth.userId === id) {
      return Response.json({ message: 'Impossible de supprimer votre propre compte' }, { status: 400 });
    }
    await db.getRepository(User).remove(user);
    return Response.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status });
    return Response.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
