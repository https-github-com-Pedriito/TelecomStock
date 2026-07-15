import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY non défini');
    _stripe = new Stripe(key, { apiVersion: '2025-06-30.basil' });
  }
  return _stripe;
}

export const PLAN_PRICES: Record<string, string | undefined> = {
  pro_mobile: process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
};

export const PLAN_LABELS: Record<string, string> = {
  pro_mobile: 'Pro Mobile — 19€/mois',
  business: 'Business — 29€/mois',
};
