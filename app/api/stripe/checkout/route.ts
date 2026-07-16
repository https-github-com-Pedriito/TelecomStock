import { NextRequest } from 'next/server';
import { getStripe, PLAN_PRICES, PLAN_LABELS } from '@/lib/stripe';
import { validatePlanSeatCount } from '@/lib/seats';
import { getDb } from '@/lib/db';
import { Tenant } from '@/entities/Tenant';
import { User } from '@/entities/User';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nom_societe, slug, admin_prenom, admin_nom, admin_email, plan } = body;
    const seats = Number(body.seats);

    if (!nom_societe || !slug || !admin_prenom || !admin_nom || !admin_email || !plan) {
      return Response.json({ message: 'Tous les champs sont requis' }, { status: 400 });
    }

    if (!PLAN_PRICES[plan]) {
      return Response.json({ message: 'Plan invalide' }, { status: 400 });
    }

    const seatError = validatePlanSeatCount(plan, seats);
    if (seatError) {
      return Response.json({ message: seatError }, { status: 400 });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return Response.json({ message: 'Slug invalide' }, { status: 400 });
    }

    const db = await getDb();
    const existingTenant = await db.getRepository(Tenant).findOne({ where: { slug } });
    if (existingTenant) {
      return Response.json({ message: 'Ce nom d\'entreprise est déjà utilisé' }, { status: 409 });
    }
    const existingUser = await db.getRepository(User).findOne({ where: { email: admin_email } });
    if (existingUser) {
      return Response.json({ message: 'Cet email est déjà associé à un compte' }, { status: 409 });
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PLAN_PRICES[plan]!, quantity: seats }],
      customer_email: admin_email,
      metadata: { nom_societe, slug, admin_prenom, admin_nom, admin_email, plan, seats: String(seats) },
      success_url: `${baseUrl}/login?registered=true`,
      cancel_url: `${baseUrl}/pricing`,
      locale: 'fr',
      subscription_data: {
        metadata: { nom_societe, slug, admin_email, plan, seats: String(seats) },
      },
      custom_text: {
        submit: { message: `Création de l'espace ${nom_societe} — ${seats} utilisateur(s) sur ${PLAN_LABELS[plan]}` },
      },
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return Response.json({ message: 'Erreur lors de la création du paiement' }, { status: 500 });
  }
}
