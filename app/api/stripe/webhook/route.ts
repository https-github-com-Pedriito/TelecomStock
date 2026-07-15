import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getDb } from '@/lib/db';
import { Tenant } from '@/entities/Tenant';
import { User, UserRole } from '@/entities/User';
import bcryptjs from 'bcryptjs';
import { sendTenantWelcomeEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return Response.json({ message: 'Signature manquante' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature error:', err);
    return Response.json({ message: 'Signature invalide' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  } else if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    await handleSubscriptionChange(event.data.object as Stripe.Subscription);
  } else if (event.type === 'invoice.paid') {
    await handleInvoicePaid(event.data.object as Stripe.Invoice);
  } else if (event.type === 'invoice.payment_failed') {
    await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
  }

  return Response.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { nom_societe, slug, admin_prenom, admin_nom, admin_email, plan } = session.metadata ?? {};
  if (!nom_societe || !slug || !admin_email) return;

  try {
    const db = await getDb();
    const tenantRepo = db.getRepository(Tenant);
    const userRepo = db.getRepository(User);

    const existing = await tenantRepo.findOne({ where: { slug } });
    if (existing) return;

    const tenant = tenantRepo.create({
      nom: nom_societe,
      slug,
      contact_email: admin_email,
      is_active: true,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      subscription_status: 'active',
      plan: plan ?? null,
    });
    await tenantRepo.save(tenant);

    const tempPassword =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-4).toUpperCase() +
      '!';
    const password_hash = await bcryptjs.hash(tempPassword, 10);

    const admin = userRepo.create({
      tenant_id: tenant.id,
      email: admin_email,
      password_hash,
      nom: admin_nom || '',
      prenom: admin_prenom || '',
      role: UserRole.ADMIN,
      is_active: true,
    });
    await userRepo.save(admin);

    try {
      await sendTenantWelcomeEmail(admin_email, nom_societe, admin_email, tempPassword);
    } catch (e) {
      console.error('Erreur envoi email bienvenue:', e);
    }
  } catch (err) {
    console.error('handleCheckoutCompleted error:', err);
  }
}

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  try {
    const db = await getDb();
    const tenant = await db.getRepository(Tenant).findOne({
      where: { stripe_subscription_id: sub.id },
    });
    if (!tenant) return;

    tenant.subscription_status = sub.status;
    if (sub.status === 'active' || sub.status === 'trialing') {
      tenant.is_active = true;
    } else if (sub.status === 'canceled' || sub.status === 'unpaid' || sub.status === 'paused') {
      tenant.is_active = false;
    }
    // 'past_due' : on garde actif temporairement, Stripe retentera le paiement
    await db.getRepository(Tenant).save(tenant);
  } catch (err) {
    console.error('handleSubscriptionChange error:', err);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  try {
    const db = await getDb();
    const tenant = await db.getRepository(Tenant).findOne({
      where: { stripe_subscription_id: invoice.subscription as string },
    });
    if (!tenant) return;
    tenant.is_active = true;
    tenant.subscription_status = 'active';
    await db.getRepository(Tenant).save(tenant);
  } catch (err) {
    console.error('handleInvoicePaid error:', err);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  // Stripe retentera automatiquement. On bloque seulement après 'unpaid' (dernière tentative)
  // Le statut 'past_due' est géré dans handleSubscriptionChange
  console.warn('Invoice payment failed for subscription:', invoice.subscription);
}
