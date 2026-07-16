import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeRepo } from '../../../test/helpers/fakeDb';
import { makeAuthHeader } from '../../../test/helpers/authRequest';
import { UserRole } from '@/entities/User';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/mailer', () => ({ sendTeamMemberWelcomeEmail: vi.fn().mockResolvedValue(undefined) }));

import { getDb } from '@/lib/db';
import { sendTeamMemberWelcomeEmail } from '@/lib/mailer';
import { GET, POST } from './route';

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

describe('GET /api/users', () => {
  it('requires ADMIN or SUPER_ADMIN role', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.TECHNICIEN as any });
    setupDb({ tenants: [{ id: tenantId, is_active: true }] });
    const req = new NextRequest('http://localhost/api/users', { headers: { Authorization } });
    const res = await GET(req, {});
    expect(res.status).toBe(403);
  });

  it('scopes results to the caller tenant and strips password hashes', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      users: [
        { id: 'u1', tenant_id: tenantId, email: 'a@x.com', password_hash: 'secret' },
        { id: 'u2', tenant_id: 'other-tenant', email: 'b@x.com', password_hash: 'secret' },
      ],
    });
    const req = new NextRequest('http://localhost/api/users', { headers: { Authorization } });
    const res = await GET(req, {});
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('u1');
    expect(data[0].password_hash).toBeUndefined();
  });
});

describe('POST /api/users', () => {
  it('rejects missing required fields', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({ tenants: [{ id: tenantId, is_active: true, seats: 5 }] });
    const req = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({ nom: 'Doe' }),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate email within the same tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, is_active: true, seats: 5 }],
      users: [{ id: 'u1', tenant_id: tenantId, email: 'jane@acme.com', is_active: true }],
    });
    const req = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({ nom: 'Doe', prenom: 'Jane', email: 'jane@acme.com', role: 'MANAGER' }),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(409);
  });

  it('rejects creation once the tenant seat limit is reached', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, is_active: true, seats: 1, nom: 'ACME' }],
      users: [{ id: 'u1', tenant_id: tenantId, email: 'existing@acme.com', is_active: true }],
    });
    const req = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({ nom: 'Doe', prenom: 'Jane', email: 'new@acme.com', role: 'MANAGER' }),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(403);
    expect(sendTeamMemberWelcomeEmail).not.toHaveBeenCalled();
  });

  it('creates the user, emails their credentials, and never returns the password hash', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({ tenants: [{ id: tenantId, is_active: true, seats: 5, nom: 'ACME' }] });
    const req = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({ nom: 'Doe', prenom: 'Jane', email: 'jane@acme.com', role: 'MANAGER' }),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.password_hash).toBeUndefined();
    expect(typeof data.tempPassword).toBe('string');
    expect(sendTeamMemberWelcomeEmail).toHaveBeenCalledWith('jane@acme.com', 'ACME', data.tempPassword);
  });
});
