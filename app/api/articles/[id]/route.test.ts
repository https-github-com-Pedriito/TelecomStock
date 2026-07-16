import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeRepo } from '../../../../test/helpers/fakeDb';
import { makeAuthHeader } from '../../../../test/helpers/authRequest';
import { UserRole } from '@/entities/User';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/realtime', () => ({ publishChange: vi.fn().mockResolvedValue(undefined) }));

import { getDb } from '@/lib/db';
import { GET, PUT, DELETE } from './route';

function setupDb(opts: { tenants?: any[]; articles?: any[]; mouvements?: any[] }) {
  const tenantRepo = createFakeRepo(opts.tenants ?? []);
  const articleRepo = createFakeRepo(opts.articles ?? []);
  const mouvementRepo = createFakeRepo(opts.mouvements ?? []);
  vi.mocked(getDb).mockResolvedValue({
    getRepository: (entity: any) => {
      if (entity.name === 'Tenant') return tenantRepo as any;
      if (entity.name === 'Article') return articleRepo as any;
      if (entity.name === 'Mouvement') return mouvementRepo as any;
      throw new Error(`Unexpected repo: ${entity.name}`);
    },
  } as any);
  return { articleRepo, mouvementRepo };
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/articles/[id]', () => {
  it('returns 404 for an article belonging to another tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader();
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      articles: [{ id: 'a1', tenant_id: 'other-tenant', nom: 'Câble' }],
    });
    const req = new NextRequest('http://localhost/api/articles/a1', { headers: { Authorization } });
    const res = await GET(req, ctx('a1'));
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/articles/[id]', () => {
  it('updates an article within the caller tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { articleRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      articles: [{ id: 'a1', tenant_id: tenantId, nom: 'Câble', quantite_stock: 5 }],
    });
    const req = new NextRequest('http://localhost/api/articles/a1', {
      method: 'PUT',
      headers: { Authorization },
      body: JSON.stringify({ nom: 'Câble blindé' }),
    });
    const res = await PUT(req, ctx('a1'));
    expect(res.status).toBe(200);
    expect(articleRepo._all()[0].nom).toBe('Câble blindé');
  });
});

describe('DELETE /api/articles/[id]', () => {
  it('blocks deletion when the article has associated mouvements', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      articles: [{ id: 'a1', tenant_id: tenantId, nom: 'Câble' }],
      mouvements: [{ id: 'm1', tenant_id: tenantId, article: { id: 'a1' } }],
    });
    const req = new NextRequest('http://localhost/api/articles/a1', { method: 'DELETE', headers: { Authorization } });
    const res = await DELETE(req, ctx('a1'));
    expect(res.status).toBe(409);
  });

  it('deletes an article with no associated mouvements', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { articleRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      articles: [{ id: 'a1', tenant_id: tenantId, nom: 'Câble' }],
      mouvements: [],
    });
    const req = new NextRequest('http://localhost/api/articles/a1', { method: 'DELETE', headers: { Authorization } });
    const res = await DELETE(req, ctx('a1'));
    expect(res.status).toBe(200);
    expect(articleRepo._all()).toHaveLength(0);
  });
});
