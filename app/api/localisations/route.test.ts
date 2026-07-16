import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeRepo } from '../../../test/helpers/fakeDb';
import { makeAuthHeader } from '../../../test/helpers/authRequest';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));

import { getDb } from '@/lib/db';
import { GET, POST } from './route';

function setupDb(opts: { tenants?: any[]; localisations?: any[] }) {
  const tenantRepo = createFakeRepo(opts.tenants ?? []);
  const localisationRepo = createFakeRepo(opts.localisations ?? []);
  vi.mocked(getDb).mockResolvedValue({
    getRepository: (entity: any) => {
      if (entity.name === 'Tenant') return tenantRepo as any;
      if (entity.name === 'Localisation') return localisationRepo as any;
      throw new Error(`Unexpected repo: ${entity.name}`);
    },
  } as any);
  return { localisationRepo };
}

describe('GET /api/localisations', () => {
  it('scopes results to the caller tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader();
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      localisations: [
        { id: 'l1', tenant_id: tenantId, nom: 'Dépôt principal' },
        { id: 'l2', tenant_id: 'other-tenant', nom: 'Dépôt B' },
      ],
    });
    const req = new NextRequest('http://localhost/api/localisations', { headers: { Authorization } });
    const res = await GET(req, {});
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('l1');
  });
});

describe('POST /api/localisations', () => {
  it('rejects a missing name', async () => {
    const { Authorization, tenantId } = makeAuthHeader();
    setupDb({ tenants: [{ id: tenantId, is_active: true }] });
    const req = new NextRequest('http://localhost/api/localisations', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({}),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it('creates a localisation scoped to the caller tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader();
    const { localisationRepo } = setupDb({ tenants: [{ id: tenantId, is_active: true }] });
    const req = new NextRequest('http://localhost/api/localisations', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({ nom: 'Dépôt principal' }),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(201);
    expect(localisationRepo._all()[0].tenant_id).toBe(tenantId);
  });
});
