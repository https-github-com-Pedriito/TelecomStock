import { NextRequest } from 'next/server';
import { withAuth, requireRole } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Tenant } from '@/entities/Tenant';
import { User, UserRole } from '@/entities/User';
import { getStripe } from '@/lib/stripe';
import { validatePlanSeatCount, enforceSeatLimit } from '@/lib/seats';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (_request, auth, { params }) => {
  requireRole(auth, UserRole.SUPER_ADMIN);
  const { id } = await params;
  const db = await getDb();
  const tenant = await db.getRepository(Tenant).findOne({ where: { id } });
  if (!tenant) return Response.json({ message: 'Tenant introuvable' }, { status: 404 });
  return Response.json(tenant);
});

export const PUT = withAuth<Ctx>(async (request, auth, { params }) => {
  requireRole(auth, UserRole.SUPER_ADMIN);
  const { id } = await params;
  const db = await getDb();
  const tenant = await db.getRepository(Tenant).findOne({ where: { id } });
  if (!tenant) return Response.json({ message: 'Tenant introuvable' }, { status: 404 });
  const body = await request.json();
  const { nom, is_active, contact_email, seats } = body;
  if (nom !== undefined) tenant.nom = nom;
  if (is_active !== undefined) tenant.is_active = is_active;
  if (contact_email !== undefined) tenant.contact_email = contact_email;

  if (seats !== undefined) {
    const newSeats = Number(seats);
    const seatError = validatePlanSeatCount(tenant.plan, newSeats);
    if (seatError) {
      return Response.json({ message: seatError }, { status: 400 });
    }

    if (tenant.stripe_subscription_id) {
      try {
        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
        const item = subscription.items.data[0];
        if (!item) {
          return Response.json({ message: 'Aucun élément de facturation trouvé sur cet abonnement Stripe' }, { status: 500 });
        }
        await stripe.subscriptions.update(tenant.stripe_subscription_id, {
          items: [{ id: item.id, quantity: newSeats }],
          proration_behavior: 'create_prorations',
        });
      } catch (err) {
        console.error('Erreur mise à jour sièges Stripe:', err);
        return Response.json({ message: "Erreur lors de la mise à jour de l'abonnement Stripe" }, { status: 500 });
      }
    }

    tenant.seats = newSeats;
  }

  await db.getRepository(Tenant).save(tenant);

  // Si la réduction des sièges laisse plus d'utilisateurs actifs que de sièges disponibles,
  // on désactive l'excédent (comptes les plus récents en premier), pour rester cohérent avec la limite.
  const deactivatedUsers = seats !== undefined
    ? (await enforceSeatLimit(db, id, tenant.seats)).map(({ id, nom, prenom, email }) => ({ id, nom, prenom, email }))
    : [];

  return Response.json({ ...tenant, deactivatedUsers });
});

export const DELETE = withAuth<Ctx>(async (_request, auth, { params }) => {
  requireRole(auth, UserRole.SUPER_ADMIN);
  const { id } = await params;
  const db = await getDb();
  const tenant = await db.getRepository(Tenant).findOne({ where: { id } });
  if (!tenant) return Response.json({ message: 'Tenant introuvable' }, { status: 404 });

  await db.getRepository(User).delete({ tenant_id: id });
  await db.getRepository(Tenant).remove(tenant);

  return Response.json({ message: 'Tenant supprimé' });
});
