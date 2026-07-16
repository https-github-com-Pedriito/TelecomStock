import { signToken, type JwtPayload } from '../../lib/auth';

let counter = 0;

/** Builds an Authorization header for a fresh, unique tenant/user pair
 *  (unique IDs avoid collisions with lib/auth.ts's in-memory tenant-active cache). */
export function makeAuthHeader(overrides: Partial<JwtPayload> = {}) {
  counter += 1;
  const defaultTenantId = `tenant-${counter}`;
  const defaultUserId = `user-${counter}`;
  const payload: JwtPayload = {
    userId: defaultUserId,
    tenantId: defaultTenantId,
    email: `user${counter}@test.com`,
    role: 'ADMIN' as JwtPayload['role'],
    nom: 'Doe',
    prenom: 'Jane',
    ...overrides,
  };
  const token = signToken(payload);
  return { Authorization: `Bearer ${token}`, tenantId: payload.tenantId, userId: payload.userId };
}
