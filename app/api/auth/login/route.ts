import { NextRequest } from 'next/server';
import bcryptjs from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { User, UserRole } from '@/entities/User';
import { Tenant } from '@/entities/Tenant';
import { getStripe } from '@/lib/stripe';

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

    // Vérifier l'abonnement du tenant (sauf SUPER_ADMIN)
    if (user.role !== UserRole.SUPER_ADMIN && user.tenant_id) {
      const tenant = await db.getRepository(Tenant).findOne({ where: { id: user.tenant_id } });
      if (tenant && !tenant.is_active) {
        let portalUrl: string | null = null;
        if (tenant.stripe_customer_id) {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const session = await getStripe().billingPortal.sessions.create({
              customer: tenant.stripe_customer_id,
              return_url: `${baseUrl}/login`,
            });
            portalUrl = session.url;
          } catch { /* Stripe non configuré ou erreur */ }
        }
        return Response.json({
          message: 'Votre abonnement est inactif. Veuillez régulariser votre situation.',
          code: 'SUBSCRIPTION_INACTIVE',
          portalUrl,
        }, { status: 402 });
      }
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
    return Response.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
