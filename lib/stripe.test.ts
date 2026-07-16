import { describe, it, expect } from 'vitest';
import { PLAN_PRICES, PLAN_UNIT_PRICE_EUR, PLAN_MAX_SEATS, PLAN_LABELS } from './stripe';

describe('plan configuration consistency', () => {
  const planKeySets = [
    Object.keys(PLAN_PRICES),
    Object.keys(PLAN_UNIT_PRICE_EUR),
    Object.keys(PLAN_MAX_SEATS),
    Object.keys(PLAN_LABELS),
  ];

  it('defines the same set of plan keys across every plan config map', () => {
    const [first, ...rest] = planKeySets.map(keys => [...keys].sort());
    for (const keys of rest) {
      expect(keys).toEqual(first);
    }
  });

  it('includes exactly the expected plans', () => {
    expect(Object.keys(PLAN_PRICES).sort()).toEqual(['business', 'pro_mobile']);
  });

  it('caps pro_mobile at 5 seats and leaves business uncapped', () => {
    expect(PLAN_MAX_SEATS.pro_mobile).toBe(5);
    expect(PLAN_MAX_SEATS.business).toBeNull();
  });

  it('prices pro_mobile below business per seat', () => {
    expect(PLAN_UNIT_PRICE_EUR.pro_mobile).toBeLessThan(PLAN_UNIT_PRICE_EUR.business);
  });

  it('has a non-empty label for every plan', () => {
    for (const label of Object.values(PLAN_LABELS)) {
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
