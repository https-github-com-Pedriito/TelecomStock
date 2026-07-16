import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeRepo } from '../../../../../test/helpers/fakeDb';
import { makeAuthHeader } from '../../../../../test/helpers/authRequest';
import { UserRole } from '@/entities/User';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/stripe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/stripe')>();
  return { ...actual, getStripe: vi.fn() };
});

import { getDb } from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { PUT, DELETE } from './route';

function superAdminAuth() {
  return makeAuthHeader({ role: UserRole.SUPER_ADMIN as any, tenantId: null });
}

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

describe('PUT /api/admin/tenants/[id] — seats', () => {
  it('rejects a seat count above the plan cap', async () => {
    const { Authorization } = superAdminAuth();
    setupDb({ tenants: [{ id: 't1', plan: 'pro_mobile', seats: 3 }] });
    const req = new NextRequest('http://localhost/api/admin/tenants/t1', {
      method: 'PUT',
      headers: { Authorization },
      body: JSON.stringify({ seats: 10 }),
    });
    const res = await PUT(req, ctx('t1'));
    expect(res.status).toBe(400);
  });

  it('updates seats directly when the tenant has no Stripe subscription', async () => {
    const { Authorization } = superAdminAuth();
    const { tenantRepo } = setupDb({ tenants: [{ id: 't1', plan: 'business', seats: 3, stripe_subscription_id: null }] });
    const req = new NextRequest('http://localhost/api/admin/tenants/t1', {
      method: 'PUT',
      headers: { Authorization },
      body: JSON.stringify({ seats: 8 }),
    });
    const res = await PUT(req, ctx('t1'));
    expect(res.status).toBe(200);
    expect(tenantRepo._all()[0].seats).toBe(8);
  });

  it('updates the Stripe subscription quantity when a subscription exists', async () => {
    const { Authorization } = superAdminAuth();
    const { tenantRepo } = setupDb({ tenants: [{ id: 't1', plan: 'business', seats: 3, stripe_subscription_id: 'sub_123' }] });
    const updateMock = vi.fn().mockResolvedValue({});
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({ items: { data: [{ id: 'si_1' }] } }),
        update: updateMock,
      },
    } as any);
    const req = new NextRequest('http://localhost/api/admin/tenants/t1', {
      method: 'PUT',
      headers: { Authorization },
      body: JSON.stringify({ seats: 7 }),
    });
    const res = await PUT(req, ctx('t1'));
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith('sub_123', expect.objectContaining({
      items: [{ id: 'si_1', quantity: 7 }],
    }));
    expect(tenantRepo._all()[0].seats).toBe(7);
  });
});

describe('DELETE /api/admin/tenants/[id]', () => {
  it('deletes the tenant and cascades to its users', async () => {
    const { Authorization } = superAdminAuth();
    const { tenantRepo, userRepo } = setupDb({
      tenants: [{ id: 't1', nom: 'ACME' }],
      users: [
        { id: 'u1', tenant_id: 't1' },
        { id: 'u2', tenant_id: 't1' },
        { id: 'u3', tenant_id: 'other-tenant' },
      ],
    });
    const req = new NextRequest('http://localhost/api/admin/tenants/t1', { method: 'DELETE', headers: { Authorization } });
    const res = await DELETE(req, ctx('t1'));
    expect(res.status).toBe(200);
    expect(tenantRepo._all()).toHaveLength(0);
    expect(userRepo._all()).toHaveLength(1);
    expect(userRepo._all()[0].id).toBe('u3');
  });

  it('returns 404 for a non-existent tenant', async () => {
    const { Authorization } = superAdminAuth();
    setupDb({ tenants: [] });
    const req = new NextRequest('http://localhost/api/admin/tenants/missing', { method: 'DELETE', headers: { Authorization } });
    const res = await DELETE(req, ctx('missing'));
    expect(res.status).toBe(404);
  });
});
