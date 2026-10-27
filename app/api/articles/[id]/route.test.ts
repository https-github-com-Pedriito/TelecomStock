import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeRepo, createFakeDataSource } from '../../../../test/helpers/fakeDb';
import { makeAuthHeader } from '../../../../test/helpers/authRequest';
import { UserRole } from '@/entities/User';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/realtime', () => ({ publishChange: vi.fn().mockResolvedValue(undefined) }));

import { getDb } from '@/lib/db';
import { GET, PUT, DELETE } from './route';

function setupDb(opts: { tenants?: any[]; articles?: any[]; mouvements?: any[]; kits?: any[]; kitLignes?: any[] }) {
  const tenantRepo = createFakeRepo(opts.tenants ?? []);
  const articleRepo = createFakeRepo(opts.articles ?? []);
  const mouvementRepo = createFakeRepo(opts.mouvements ?? []);
  const kitRepo = createFakeRepo(opts.kits ?? []);
  const kitLigneRepo = createFakeRepo(opts.kitLignes ?? []);
  vi.mocked(getDb).mockResolvedValue(
    createFakeDataSource({
      Tenant: tenantRepo,
      Article: articleRepo,
      Mouvement: mouvementRepo,
      Kit: kitRepo,
      KitLigne: kitLigneRepo,
    }) as any
  );
  return { articleRepo, mouvementRepo, kitRepo, kitLigneRepo };
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

describe('DELETE /api/articles/[id] — article utilisé par un kit', () => {
  const kitSetup = (tenantId: string | null) => ({
    tenants: [{ id: tenantId, is_active: true }],
    articles: [{ id: 'a1', tenant_id: tenantId, nom: 'Antenne' }],
    kits: [{ id: 'k1', tenant_id: tenantId, code: 'KIT-NAT-DIR', nom: 'Directionnel', est_actif: true }],
    kitLignes: [{ id: 'l1', kit_id: 'k1', article_id: 'a1', quantite: 1 }],
  });

  it('refuses the deletion and names the kits that use the article', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { articleRepo } = setupDb(kitSetup(tenantId));

    const req = new NextRequest('http://localhost/api/articles/a1', {
      method: 'DELETE',
      headers: { Authorization },
    });
    const res = await DELETE(req, ctx('a1'));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('ARTICLE_UTILISE_PAR_KIT');
    expect(body.kits).toEqual([{ id: 'k1', code: 'KIT-NAT-DIR', nom: 'Directionnel' }]);
    // L'article est toujours la : la cascade n'a pas vide la nomenclature.
    expect(articleRepo._all()).toHaveLength(1);
  });

  it('allows the deletion with force=true', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { articleRepo } = setupDb(kitSetup(tenantId));

    const req = new NextRequest('http://localhost/api/articles/a1?force=true', {
      method: 'DELETE',
      headers: { Authorization },
    });
    const res = await DELETE(req, ctx('a1'));

    expect(res.status).toBe(200);
    expect(articleRepo._all()).toHaveLength(0);
  });

  it('ignores a kit line belonging to another tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { articleRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      articles: [{ id: 'a1', tenant_id: tenantId, nom: 'Antenne' }],
      kits: [{ id: 'k1', tenant_id: 'autre-tenant', code: 'KIT-AUTRE', nom: 'Autre', est_actif: true }],
      kitLignes: [{ id: 'l1', kit_id: 'k1', article_id: 'a1', quantite: 1 }],
    });

    const req = new NextRequest('http://localhost/api/articles/a1', {
      method: 'DELETE',
      headers: { Authorization },
    });
    const res = await DELETE(req, ctx('a1'));

    expect(res.status).toBe(200);
    expect(articleRepo._all()).toHaveLength(0);
  });
});
