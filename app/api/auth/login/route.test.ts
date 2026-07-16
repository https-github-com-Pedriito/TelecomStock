import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import bcryptjs from 'bcryptjs';
import { createFakeRepo } from '../../../../test/helpers/fakeDb';
import { UserRole } from '@/entities/User';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/stripe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/stripe')>();
  return { ...actual, getStripe: vi.fn() };
});

import { getDb } from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { POST } from './route';

const PASSWORD = 'correct-horse-battery-staple';
let passwordHash: string;

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function setupDb(users: any[], tenants: any[] = []) {
  vi.mocked(getDb).mockResolvedValue({
    getRepository: (entity: any) => {
      if (entity.name === 'User') return createFakeRepo(users) as any;
      if (entity.name === 'Tenant') return createFakeRepo(tenants) as any;
      throw new Error(`Unexpected repo: ${entity.name}`);
    },
  } as any);
}

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    passwordHash = await bcryptjs.hash(PASSWORD, 4);
  });

  it('rejects missing credentials', async () => {
    const res = await POST(makeRequest({ email: '', password: '' }));
    expect(res.status).toBe(400);
  });

  it('rejects an unknown email', async () => {
    setupDb([]);
    const res = await POST(makeRequest({ email: 'nobody@x.com', password: PASSWORD }));
    expect(res.status).toBe(401);
  });

  it('rejects an incorrect password', async () => {
    setupDb([{ id: 'u1', email: 'jane@acme.com', password_hash: passwordHash, is_active: true, role: UserRole.ADMIN, tenant_id: 't1' }]);
    const res = await POST(makeRequest({ email: 'jane@acme.com', password: 'wrong-password' }));
    expect(res.status).toBe(401);
  });

  it('rejects a deactivated user account', async () => {
    setupDb([{ id: 'u1', email: 'jane@acme.com', password_hash: passwordHash, is_active: false, role: UserRole.ADMIN, tenant_id: 't1' }]);
    const res = await POST(makeRequest({ email: 'jane@acme.com', password: PASSWORD }));
    expect(res.status).toBe(401);
  });

  it('blocks login with 402 + portal link when the tenant subscription is inactive', async () => {
    setupDb(
      [{ id: 'u1', email: 'jane@acme.com', password_hash: passwordHash, is_active: true, role: UserRole.ADMIN, tenant_id: 't1' }],
      [{ id: 't1', is_active: false, stripe_customer_id: 'cus_123' }]
    );
    vi.mocked(getStripe).mockReturnValue({
      billingPortal: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/session' }) } },
    } as any);

    const res = await POST(makeRequest({ email: 'jane@acme.com', password: PASSWORD }));
    expect(res.status).toBe(402);
    const data = await res.json();
    expect(data.code).toBe('SUBSCRIPTION_INACTIVE');
    expect(data.portalUrl).toContain('billing.stripe.com');
  });

  it('does not check tenant subscription status for SUPER_ADMIN', async () => {
    setupDb(
      [{ id: 'u1', email: 'root@acme.com', password_hash: passwordHash, is_active: true, role: UserRole.SUPER_ADMIN, tenant_id: null }],
      []
    );
    const res = await POST(makeRequest({ email: 'root@acme.com', password: PASSWORD }));
    expect(res.status).toBe(200);
  });

  it('logs in successfully and returns a token without the password hash', async () => {
    setupDb(
      [{ id: 'u1', email: 'jane@acme.com', password_hash: passwordHash, is_active: true, role: UserRole.ADMIN, tenant_id: 't1', nom: 'Doe', prenom: 'Jane' }],
      [{ id: 't1', is_active: true }]
    );
    const res = await POST(makeRequest({ email: 'jane@acme.com', password: PASSWORD }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.token).toBe('string');
    expect(data.user.password_hash).toBeUndefined();
    expect(data.user.email).toBe('jane@acme.com');
  });
});
