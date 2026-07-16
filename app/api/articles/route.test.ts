import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeRepo } from '../../../test/helpers/fakeDb';
import { makeAuthHeader } from '../../../test/helpers/authRequest';
import { UserRole } from '@/entities/User';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/realtime', () => ({ publishChange: vi.fn().mockResolvedValue(undefined) }));

import { getDb } from '@/lib/db';
import { GET, POST } from './route';

function setupDb(opts: { tenants?: any[]; articles?: any[] }) {
  const tenantRepo = createFakeRepo(opts.tenants ?? []);
  const articleRepo = createFakeRepo(opts.articles ?? []);
  vi.mocked(getDb).mockResolvedValue({
    getRepository: (entity: any) => {
      if (entity.name === 'Tenant') return tenantRepo as any;
      if (entity.name === 'Article') return articleRepo as any;
      throw new Error(`Unexpected repo: ${entity.name}`);
    },
  } as any);
  return { articleRepo };
}

describe('GET /api/articles', () => {
  it('scopes results to the caller tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader();
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      articles: [
        { id: 'a1', tenant_id: tenantId, nom: 'Câble' },
        { id: 'a2', tenant_id: 'other-tenant', nom: 'Prise' },
      ],
    });
    const req = new NextRequest('http://localhost/api/articles', { headers: { Authorization } });
    const res = await GET(req, {});
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('a1');
  });
});

describe('POST /api/articles', () => {
  it('requires ADMIN or MANAGER role', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.TECHNICIEN as any });
    setupDb({ tenants: [{ id: tenantId, is_active: true }] });
    const req = new NextRequest('http://localhost/api/articles', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({ nom: 'Câble RJ45' }),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(403);
  });

  it('rejects an article with no name', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({ tenants: [{ id: tenantId, is_active: true }] });
    const req = new NextRequest('http://localhost/api/articles', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({}),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it('creates an article scoped to the caller tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { articleRepo } = setupDb({ tenants: [{ id: tenantId, is_active: true }] });
    const req = new NextRequest('http://localhost/api/articles', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({ nom: 'Câble RJ45', quantite_stock: 10, seuil_minimum: 2 }),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(201);
    const [article] = articleRepo._all();
    expect(article.tenant_id).toBe(tenantId);
    expect(article.nom).toBe('Câble RJ45');
  });
});
