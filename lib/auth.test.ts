import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, requireRole, requireTenant, AuthError, type JwtPayload } from './auth';
import { UserRole } from '@/entities/User';

function makePayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    userId: 'user-1',
    tenantId: 'tenant-1',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    nom: 'Doe',
    prenom: 'Jane',
    ...overrides,
  };
}

describe('signToken / verifyToken', () => {
  it('round-trips a payload through sign and verify', () => {
    const payload = makePayload();
    const token = signToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.tenantId).toBe(payload.tenantId);
    expect(decoded.role).toBe(payload.role);
  });

  it('throws when verifying a tampered/invalid token', () => {
    expect(() => verifyToken('not-a-real-token')).toThrow();
  });
});

describe('requireRole', () => {
  it('allows a matching role', () => {
    const payload = makePayload({ role: UserRole.ADMIN });
    expect(() => requireRole(payload, UserRole.ADMIN, UserRole.SUPER_ADMIN)).not.toThrow();
  });

  it('rejects a non-matching role', () => {
    const payload = makePayload({ role: UserRole.TECHNICIEN });
    expect(() => requireRole(payload, UserRole.ADMIN)).toThrow(AuthError);
  });

  it('always allows SUPER_ADMIN regardless of the required roles', () => {
    const payload = makePayload({ role: UserRole.SUPER_ADMIN });
    expect(() => requireRole(payload, UserRole.TECHNICIEN)).not.toThrow();
  });

  it('rejection carries a 403 status', () => {
    const payload = makePayload({ role: UserRole.TECHNICIEN });
    try {
      requireRole(payload, UserRole.ADMIN);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).status).toBe(403);
    }
  });
});

describe('requireTenant', () => {
  it('returns null for SUPER_ADMIN regardless of tenantId', () => {
    const payload = makePayload({ role: UserRole.SUPER_ADMIN, tenantId: null });
    expect(requireTenant(payload)).toBeNull();
  });

  it('returns the tenantId for a regular user', () => {
    const payload = makePayload({ role: UserRole.ADMIN, tenantId: 'tenant-42' });
    expect(requireTenant(payload)).toBe('tenant-42');
  });

  it('throws if a non-super-admin has no tenantId', () => {
    const payload = makePayload({ role: UserRole.ADMIN, tenantId: null });
    expect(() => requireTenant(payload)).toThrow(AuthError);
  });
});
