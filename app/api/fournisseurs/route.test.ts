import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeRepo } from '../../../test/helpers/fakeDb';
import { makeAuthHeader } from '../../../test/helpers/authRequest';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));

import { getDb } from '@/lib/db';
import { GET, POST } from './route';

function setupDb(opts: { tenants?: any[]; fournisseurs?: any[] }) {
  const tenantRepo = createFakeRepo(opts.tenants ?? []);
  const fournisseurRepo = createFakeRepo(opts.fournisseurs ?? []);
  vi.mocked(getDb).mockResolvedValue({
    getRepository: (entity: any) => {
      if (entity.name === 'Tenant') return tenantRepo as any;
      if (entity.name === 'Fournisseur') return fournisseurRepo as any;
      throw new Error(`Unexpected repo: ${entity.name}`);
    },
  } as any);
  return { fournisseurRepo };
}

describe('GET /api/fournisseurs', () => {
  it('scopes results to the caller tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader();
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      fournisseurs: [
        { id: 'f1', tenant_id: tenantId, nom: 'Fournisseur A' },
        { id: 'f2', tenant_id: 'other-tenant', nom: 'Fournisseur B' },
      ],
    });
    const req = new NextRequest('http://localhost/api/fournisseurs', { headers: { Authorization } });
    const res = await GET(req, {});
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('f1');
  });
});

describe('POST /api/fournisseurs', () => {
  it('rejects a missing name', async () => {
    const { Authorization, tenantId } = makeAuthHeader();
    setupDb({ tenants: [{ id: tenantId, is_active: true }] });
    const req = new NextRequest('http://localhost/api/fournisseurs', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({}),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it('creates a fournisseur scoped to the caller tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader();
    const { fournisseurRepo } = setupDb({ tenants: [{ id: tenantId, is_active: true }] });
    const req = new NextRequest('http://localhost/api/fournisseurs', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({ nom: 'Fournisseur A', email: 'contact@fournisseur.com' }),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(201);
    expect(fournisseurRepo._all()[0].tenant_id).toBe(tenantId);
  });
});
