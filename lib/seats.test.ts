import { describe, it, expect } from 'vitest';
import { validatePlanSeatCount, hasSeatAvailable, selectUsersToDeactivate } from './seats';

describe('validatePlanSeatCount', () => {
  it('rejects non-integer seat counts', () => {
    expect(validatePlanSeatCount('pro_mobile', 1.5)).toMatch(/invalide/i);
  });

  it('rejects zero or negative seat counts', () => {
    expect(validatePlanSeatCount('pro_mobile', 0)).toMatch(/invalide/i);
    expect(validatePlanSeatCount('pro_mobile', -3)).toMatch(/invalide/i);
  });

  it('accepts a valid seat count within the pro_mobile cap (5)', () => {
    expect(validatePlanSeatCount('pro_mobile', 5)).toBeNull();
  });

  it('rejects a seat count above the pro_mobile cap (5)', () => {
    expect(validatePlanSeatCount('pro_mobile', 6)).toMatch(/limité/i);
  });

  it('allows unlimited seats on the business plan', () => {
    expect(validatePlanSeatCount('business', 500)).toBeNull();
  });

  it('does not enforce a cap for an unknown/null plan', () => {
    expect(validatePlanSeatCount(null, 1000)).toBeNull();
    expect(validatePlanSeatCount('unknown_plan', 1000)).toBeNull();
  });
});

describe('hasSeatAvailable', () => {
  it('is true when active users are below the seat count', () => {
    expect(hasSeatAvailable(2, 5)).toBe(true);
  });

  it('is false once active users reach the seat count', () => {
    expect(hasSeatAvailable(5, 5)).toBe(false);
  });

  it('is false when active users exceed the seat count', () => {
    expect(hasSeatAvailable(6, 5)).toBe(false);
  });
});

describe('selectUsersToDeactivate', () => {
  const user = (id: string, created_at: string) => ({ id, created_at });

  it('deactivates no one when active users fit within the seat count', () => {
    const users = [user('a', '2026-01-01'), user('b', '2026-01-02')];
    expect(selectUsersToDeactivate(users, 5)).toEqual([]);
  });

  it('deactivates no one when active users exactly match the seat count', () => {
    const users = [user('a', '2026-01-01'), user('b', '2026-01-02')];
    expect(selectUsersToDeactivate(users, 2)).toEqual([]);
  });

  it('keeps the earliest-created users active and deactivates the excess, most recent first', () => {
    const users = [
      user('newest', '2026-03-01'),
      user('oldest', '2026-01-01'),
      user('middle', '2026-02-01'),
    ];
    const result = selectUsersToDeactivate(users, 1);
    expect(result.map(u => u.id)).toEqual(['middle', 'newest']);
  });

  it('does not mutate the input array order', () => {
    const users = [user('newest', '2026-03-01'), user('oldest', '2026-01-01')];
    selectUsersToDeactivate(users, 1);
    expect(users[0].id).toBe('newest');
  });
});
