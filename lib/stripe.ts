import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY non défini');
    _stripe = new Stripe(key, { apiVersion: Stripe.API_VERSION });
  }
  return _stripe;
}

export const PLAN_PRICES: Record<string, string | undefined> = {
  pro_mobile: process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
};

export const PLAN_UNIT_PRICE_EUR: Record<string, number> = {
  pro_mobile: 19,
  business: 29,
};

// null = pas de plafond
export const PLAN_MAX_SEATS: Record<string, number | null> = {
  pro_mobile: 5,
  business: null,
};

export const PLAN_LABELS: Record<string, string> = {
  pro_mobile: 'Pro Mobile — 19€/utilisateur/mois',
  business: 'Business — 29€/utilisateur/mois',
};
