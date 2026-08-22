import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeRepo } from '../../../../test/helpers/fakeDb';
import { makeAuthHeader } from '../../../../test/helpers/authRequest';
import { UserRole } from '@/entities/User';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));

import { getDb } from '@/lib/db';
import { PUT } from './route';

function setupDb(opts: { tenants?: any[]; users?: any[] }) {
  const tenantRepo = createFakeRepo(opts.tenants ?? []);
  const userRepo = createFakeRepo(opts.users ?? []);
  vi.mocked(getDb).mockResolvedValue({
    getRepository: (entity: any) => {
      if (entity.name === 'Tenant') return tenantRepo as any;
      if (entity.name === 'User') return userRepo as any;
      throw new Error(`Unexpected repo: ${entity.name}`);
    },
  } as any);
  return { tenantRepo, userRepo };
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req(body: unknown, Authorization: string) {
  return new NextRequest('http://localhost/api/users/target', {
    method: 'PUT',
    headers: { Authorization },
    body: JSON.stringify(body),
  });
}

describe('PUT /api/users/[id] — seat limit on reactivation', () => {
  it('rejects reactivating a user when the tenant has no free seat', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { userRepo } = setupDb({
      tenants: [{ id: tenantId, seats: 1 }],
      users: [
        { id: 'active-1', tenant_id: tenantId, is_active: true },
        { id: 'target', tenant_id: tenantId, is_active: false },
      ],
    });
    const res = await PUT(req({ is_active: true }, Authorization), ctx('target'));
    expect(res.status).toBe(403);
    expect(userRepo._all().find(u => u.id === 'target')!.is_active).toBe(false);
  });

  it('allows reactivating a user when a seat is free', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { userRepo } = setupDb({
      tenants: [{ id: tenantId, seats: 2 }],
      users: [
        { id: 'active-1', tenant_id: tenantId, is_active: true },
        { id: 'target', tenant_id: tenantId, is_active: false },
      ],
    });
    const res = await PUT(req({ is_active: true }, Authorization), ctx('target'));
    expect(res.status).toBe(200);
    expect(userRepo._all().find(u => u.id === 'target')!.is_active).toBe(true);
  });

  it('allows deactivating a user regardless of seat count', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { userRepo } = setupDb({
      tenants: [{ id: tenantId, seats: 1 }],
      users: [{ id: 'target', tenant_id: tenantId, is_active: true }],
    });
    const res = await PUT(req({ is_active: false }, Authorization), ctx('target'));
    expect(res.status).toBe(200);
    expect(userRepo._all().find(u => u.id === 'target')!.is_active).toBe(false);
  });

  it('allows editing other fields on an already-active user without a seat check', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { userRepo } = setupDb({
      tenants: [{ id: tenantId, seats: 1 }],
      users: [{ id: 'target', tenant_id: tenantId, is_active: true, nom: 'Old' }],
    });
    const res = await PUT(req({ nom: 'New' }, Authorization), ctx('target'));
    expect(res.status).toBe(200);
    expect(userRepo._all().find(u => u.id === 'target')!.nom).toBe('New');
  });

  it('rejects reassigning an active user to a tenant without a free seat', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.SUPER_ADMIN as any, tenantId: null });
    setupDb({
      tenants: [
        { id: 'source', seats: 5 },
        { id: 'target-tenant', seats: 1 },
      ],
      users: [
        { id: 'already-there', tenant_id: 'target-tenant', is_active: true },
        { id: 'moving', tenant_id: 'source', is_active: true },
      ],
    });
    void tenantId;
    const res = await PUT(req({ tenant_id: 'target-tenant' }, Authorization), ctx('moving'));
    expect(res.status).toBe(403);
  });
});
