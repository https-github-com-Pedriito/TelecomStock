import type { DataSource } from 'typeorm';
import { PLAN_MAX_SEATS } from '@/lib/stripe';
import { User } from '@/entities/User';

export function validatePlanSeatCount(plan: string | null | undefined, seats: number): string | null {
  if (!Number.isInteger(seats) || seats < 1) return "Nombre d'utilisateurs invalide";
  const maxSeats = plan ? PLAN_MAX_SEATS[plan] : null;
  if (maxSeats && seats > maxSeats) return `Ce plan est limité à ${maxSeats} utilisateurs`;
  return null;
}

export function hasSeatAvailable(activeUserCount: number, seats: number): boolean {
  return activeUserCount < seats;
}

// Détermine qui désactiver quand il y a plus d'utilisateurs actifs que de sièges disponibles :
// on garde actifs les comptes les plus anciens et on désactive l'excédent par ordre de création
// (les derniers créés en premier).
export function selectUsersToDeactivate<T extends { created_at: Date | string }>(
  activeUsers: T[],
  seats: number
): T[] {
  if (activeUsers.length <= seats) return [];
  const sorted = [...activeUsers].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  return sorted.slice(Math.max(0, seats));
}

// Applique la désactivation en base pour un tenant donné et retourne les utilisateurs désactivés.
export async function enforceSeatLimit(db: DataSource, tenantId: string, seats: number): Promise<User[]> {
  const userRepo = db.getRepository(User);
  const activeUsers = await userRepo.find({
    where: { tenant_id: tenantId, is_active: true },
    order: { created_at: 'ASC' },
  });
  const toDeactivate = selectUsersToDeactivate(activeUsers, seats);
  if (toDeactivate.length === 0) return [];
  for (const u of toDeactivate) u.is_active = false;
  await userRepo.save(toDeactivate);
  return toDeactivate;
}
