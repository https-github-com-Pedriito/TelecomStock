import { describe, it, expect } from 'vitest';
import { getStockLevel, isStockAlertable } from './stock';

describe('getStockLevel', () => {
  it('returns "ok" when quantity is comfortably above threshold', () => {
    expect(getStockLevel(10, 5)).toBe('ok');
  });

  it('returns "critique" when quantity equals the threshold', () => {
    expect(getStockLevel(5, 5)).toBe('critique');
  });

  it('returns "critique" when quantity is below threshold but above zero', () => {
    expect(getStockLevel(2, 5)).toBe('critique');
  });

  it('returns "rupture" when quantity is exactly zero', () => {
    expect(getStockLevel(0, 5)).toBe('rupture');
  });

  it('returns "rupture" when quantity is negative (defensive)', () => {
    expect(getStockLevel(-1, 5)).toBe('rupture');
  });

  it('returns "rupture" over "critique" even when threshold is zero', () => {
    expect(getStockLevel(0, 0)).toBe('rupture');
  });

  it('returns "ok" when threshold is zero and quantity is positive', () => {
    expect(getStockLevel(1, 0)).toBe('ok');
  });
});

describe('isStockAlertable', () => {
  it('is false for "ok" levels', () => {
    expect(isStockAlertable(10, 5)).toBe(false);
  });

  it('is true for "critique" levels', () => {
    expect(isStockAlertable(5, 5)).toBe(true);
  });

  it('is true for "rupture" levels', () => {
    expect(isStockAlertable(0, 5)).toBe(true);
  });
});
