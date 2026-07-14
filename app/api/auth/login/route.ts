import { NextRequest } from 'next/server';
import bcryptjs from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { User } from '@/entities/User';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return Response.json({ message: 'Email et mot de passe requis' }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.getRepository(User).findOne({ where: { email } });

    if (!user || !(await bcryptjs.compare(password, user.password_hash))) {
      return Response.json({ message: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    if (!user.is_active) {
      return Response.json({ message: 'Compte désactivé' }, { status: 401 });
    }

    const token = signToken({
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
    });

    const { password_hash: _, ...userWithoutPassword } = user;
    return Response.json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error('Login error:', err);
    return Response.json({
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 4).join(' | ') : undefined,
    }, { status: 500 });
  }
}
