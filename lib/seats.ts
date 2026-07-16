import { PLAN_MAX_SEATS } from '@/lib/stripe';

export function validatePlanSeatCount(plan: string | null | undefined, seats: number): string | null {
  if (!Number.isInteger(seats) || seats < 1) return "Nombre d'utilisateurs invalide";
  const maxSeats = plan ? PLAN_MAX_SEATS[plan] : null;
  if (maxSeats && seats > maxSeats) return `Ce plan est limité à ${maxSeats} utilisateurs`;
  return null;
}

export function hasSeatAvailable(activeUserCount: number, seats: number): boolean {
  return activeUserCount < seats;
}
