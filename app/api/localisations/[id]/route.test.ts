import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeRepo } from '../../../../test/helpers/fakeDb';
import { makeAuthHeader } from '../../../../test/helpers/authRequest';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));

import { getDb } from '@/lib/db';
import { GET, PUT, DELETE } from './route';

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

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/localisations/[id]', () => {
  it('returns 404 for a localisation belonging to another tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader();
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      localisations: [{ id: 'l1', tenant_id: 'other-tenant', nom: 'Dépôt' }],
    });
    const req = new NextRequest('http://localhost/api/localisations/l1', { headers: { Authorization } });
    const res = await GET(req, ctx('l1'));
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/localisations/[id]', () => {
  it('toggles is_active on a localisation (dépôt activate/deactivate)', async () => {
    const { Authorization, tenantId } = makeAuthHeader();
    const { localisationRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      localisations: [{ id: 'l1', tenant_id: tenantId, nom: 'Dépôt', is_active: true }],
    });
    const req = new NextRequest('http://localhost/api/localisations/l1', {
      method: 'PUT',
      headers: { Authorization },
      body: JSON.stringify({ is_active: false }),
    });
    const res = await PUT(req, ctx('l1'));
    expect(res.status).toBe(200);
    expect(localisationRepo._all()[0].is_active).toBe(false);
  });
});

describe('DELETE /api/localisations/[id]', () => {
  it('removes the localisation', async () => {
    const { Authorization, tenantId } = makeAuthHeader();
    const { localisationRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      localisations: [{ id: 'l1', tenant_id: tenantId, nom: 'Dépôt' }],
    });
    const req = new NextRequest('http://localhost/api/localisations/l1', { method: 'DELETE', headers: { Authorization } });
    const res = await DELETE(req, ctx('l1'));
    expect(res.status).toBe(200);
    expect(localisationRepo._all()).toHaveLength(0);
  });
});
