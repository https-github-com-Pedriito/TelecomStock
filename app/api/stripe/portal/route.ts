import { NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Tenant } from '@/entities/Tenant';
import { getStripe } from '@/lib/stripe';

// Utilise requireAuth directement (pas withAuth) pour que les tenants inactifs
// puissent quand même accéder au portail de paiement.
export async function GET(request: NextRequest) {
  let auth;
  try {
    auth = requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status });
    return Response.json({ message: 'Erreur serveur' }, { status: 500 });
  }

  const tenantId = auth.tenantId;
  if (!tenantId) return Response.json({ message: 'Non disponible pour le SUPER_ADMIN' }, { status: 403 });

  const db = await getDb();
  const tenant = await db.getRepository(Tenant).findOne({ where: { id: tenantId } });

  if (!tenant?.stripe_customer_id) {
    return Response.json({ message: 'Aucun abonnement Stripe associé' }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id,
    return_url: `${baseUrl}/dashboard`,
  });

  return Response.json({ url: session.url });
});
