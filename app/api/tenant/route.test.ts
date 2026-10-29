import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeRepo } from '../../../test/helpers/fakeDb';
import { makeAuthHeader } from '../../../test/helpers/authRequest';
import { UserRole } from '@/entities/User';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));

import { getDb } from '@/lib/db';
import { GET, PUT } from './route';

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
  return { tenantRepo };
}

function put(Authorization: string, body: unknown) {
  return PUT(
    new NextRequest('http://localhost/api/tenant', {
      method: 'PUT',
      headers: { Authorization },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    {}
  );
}

describe('GET /api/tenant — alert emails', () => {
  it('returns the configured alert addresses', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({ tenants: [{ id: tenantId, nom: 'ACME', seats: 3, is_active: true, alert_emails: ['achats@acme.fr'] }] });
    const res = await GET(new NextRequest('http://localhost/api/tenant', { headers: { Authorization } }), {});
    expect(res.status).toBe(200);
    expect((await res.json()).alert_emails).toEqual(['achats@acme.fr']);
  });

  it('returns an empty list when none was ever configured', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({ tenants: [{ id: tenantId, nom: 'ACME', seats: 3, is_active: true }] });
    const res = await GET(new NextRequest('http://localhost/api/tenant', { headers: { Authorization } }), {});
    expect((await res.json()).alert_emails).toEqual([]);
  });
});

describe('PUT /api/tenant — alert emails', () => {
  it('saves up to two addresses, normalised', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { tenantRepo } = setupDb({ tenants: [{ id: tenantId, nom: 'ACME', is_active: true }] });

    const res = await put(Authorization, { alert_emails: [' Achats@ACME.fr ', 'dir@acme.fr'] });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ alert_emails: ['achats@acme.fr', 'dir@acme.fr'] });
    expect(tenantRepo._all()[0].alert_emails).toEqual(['achats@acme.fr', 'dir@acme.fr']);
  });

  it('replaces the previous addresses and can clear them', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { tenantRepo } = setupDb({ tenants: [{ id: tenantId, nom: 'ACME', is_active: true, alert_emails: ['old@acme.fr'] }] });

    await put(Authorization, { alert_emails: ['new@acme.fr'] });
    expect(tenantRepo._all()[0].alert_emails).toEqual(['new@acme.fr']);

    await put(Authorization, { alert_emails: [] });
    expect(tenantRepo._all()[0].alert_emails).toEqual([]);
  });

  it('does not touch the other tenant fields', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { tenantRepo } = setupDb({ tenants: [{ id: tenantId, nom: 'ACME', seats: 5, plan: 'business', is_active: true }] });
    await put(Authorization, { alert_emails: ['a@acme.fr'] });
    expect(tenantRepo._all()[0]).toMatchObject({ nom: 'ACME', seats: 5, plan: 'business', is_active: true });
  });

  it('rejects more than two addresses and saves nothing', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { tenantRepo } = setupDb({ tenants: [{ id: tenantId, nom: 'ACME', is_active: true, alert_emails: ['keep@acme.fr'] }] });
    const res = await put(Authorization, { alert_emails: ['a@acme.fr', 'b@acme.fr', 'c@acme.fr'] });
    expect(res.status).toBe(400);
    expect(tenantRepo._all()[0].alert_emails).toEqual(['keep@acme.fr']);
  });

  it('rejects an invalid address with its name in the message', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({ tenants: [{ id: tenantId, nom: 'ACME', is_active: true }] });
    const res = await put(Authorization, { alert_emails: ['pas-un-mail'] });
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain('pas-un-mail');
  });

  it.each([{}, { alert_emails: 'a@acme.fr' }, 'not json'])('rejects a malformed body %j', async (body) => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({ tenants: [{ id: tenantId, nom: 'ACME', is_active: true }] });
    const res = await put(Authorization, body);
    expect(res.status).toBe(400);
  });

  it.each([UserRole.MANAGER, UserRole.TECHNICIEN])('forbids the %s role', async (role) => {
    const { Authorization, tenantId } = makeAuthHeader({ role: role as any });
    const { tenantRepo } = setupDb({ tenants: [{ id: tenantId, nom: 'ACME', is_active: true }] });
    const res = await put(Authorization, { alert_emails: ['a@acme.fr'] });
    expect(res.status).toBe(403);
    expect(tenantRepo._all()[0].alert_emails).toBeUndefined();
  });

  it('only changes the caller\'s own tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { tenantRepo } = setupDb({
      tenants: [
        { id: tenantId, nom: 'ACME', is_active: true },
        { id: 'other', nom: 'Autre', is_active: true, alert_emails: ['x@autre.fr'] },
      ],
    });
    await put(Authorization, { alert_emails: ['a@acme.fr'] });
    const other = tenantRepo._all().find(t => t.id === 'other')!;
    expect(other.alert_emails).toEqual(['x@autre.fr']);
  });

  it('returns 404 for a super admin without a tenant', async () => {
    const { Authorization } = makeAuthHeader({ role: UserRole.SUPER_ADMIN as any, tenantId: null });
    setupDb({ tenants: [] });
    const res = await put(Authorization, { alert_emails: ['a@acme.fr'] });
    expect(res.status).toBe(404);
  });

  it('requires authentication', async () => {
    setupDb({ tenants: [] });
    const res = await PUT(new NextRequest('http://localhost/api/tenant', { method: 'PUT', body: '{}' }), {});
    expect(res.status).toBe(401);
  });
});
