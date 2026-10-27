import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeRepo, createFakeDataSource } from '../../../../test/helpers/fakeDb';
import { makeAuthHeader } from '../../../../test/helpers/authRequest';
import { UserRole } from '@/entities/User';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/realtime', () => ({ publishChange: vi.fn().mockResolvedValue(undefined) }));

import { getDb } from '@/lib/db';
import { GET, PUT, DELETE } from './route';

function setupDb(opts: { tenants?: any[]; kits?: any[]; lignes?: any[]; articles?: any[] }) {
  const tenantRepo = createFakeRepo(opts.tenants ?? []);
  const kitRepo = createFakeRepo(opts.kits ?? []);
  const ligneRepo = createFakeRepo(opts.lignes ?? []);
  const articleRepo = createFakeRepo(opts.articles ?? []);
  vi.mocked(getDb).mockResolvedValue(
    createFakeDataSource({
      Tenant: tenantRepo,
      Kit: kitRepo,
      KitLigne: ligneRepo,
      Article: articleRepo,
    }) as any
  );
  return { tenantRepo, kitRepo, ligneRepo, articleRepo };
}

function articles(tenantId: string | null) {
  return [
    { id: 'antenne', tenant_id: tenantId, nom: 'Antenne', quantite_stock: 10, seuil_minimum: 2 },
    { id: 'cable', tenant_id: tenantId, nom: 'Cable', quantite_stock: 500, seuil_minimum: 100 },
  ];
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function request(method: string, Authorization: string, body?: unknown) {
  return new NextRequest('http://localhost/api/kits/k1', {
    method,
    headers: { Authorization },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe('GET /api/kits/[id]', () => {
  it('refuses to read a kit belonging to another tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      kits: [{ id: 'k1', tenant_id: 'autre-tenant', code: 'KIT-AUTRE', nom: 'Autre', est_actif: true }],
    });

    const res = await GET(request('GET', Authorization), ctx('k1'));
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/kits/[id]', () => {
  it('replaces the nomenclature wholesale', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.MANAGER as any });
    const { ligneRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      kits: [{ id: 'k1', tenant_id: tenantId, code: 'KIT-NAT-DIR', nom: 'Directionnel', est_actif: true }],
      lignes: [
        { id: 'l1', kit_id: 'k1', article_id: 'antenne', quantite: 1 },
        { id: 'l2', kit_id: 'k1', article_id: 'cable', quantite: 40 },
      ],
      articles: articles(tenantId),
    });

    const res = await PUT(
      request('PUT', Authorization, { lignes: [{ article_id: 'cable', quantite: 60 }] }),
      ctx('k1')
    );

    expect(res.status).toBe(200);
    const restantes = ligneRepo._all();
    expect(restantes).toHaveLength(1);
    expect(restantes[0]).toMatchObject({ article_id: 'cable', quantite: 60 });
  });

  it('leaves the nomenclature untouched when lignes is absent', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { ligneRepo, kitRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      kits: [{ id: 'k1', tenant_id: tenantId, code: 'KIT-NAT-DIR', nom: 'Directionnel', est_actif: true }],
      lignes: [{ id: 'l1', kit_id: 'k1', article_id: 'antenne', quantite: 1 }],
      articles: articles(tenantId),
    });

    const res = await PUT(request('PUT', Authorization, { est_actif: false }), ctx('k1'));

    expect(res.status).toBe(200);
    expect(kitRepo._all()[0].est_actif).toBe(false);
    expect(ligneRepo._all()).toHaveLength(1);
  });

  it('refuses renaming a kit onto an existing code', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      kits: [
        { id: 'k1', tenant_id: tenantId, code: 'KIT-NAT-DIR', nom: 'Directionnel', est_actif: true },
        { id: 'k2', tenant_id: tenantId, code: 'KIT-NAT-OMN', nom: 'Omni', est_actif: true },
      ],
      articles: articles(tenantId),
    });

    const res = await PUT(request('PUT', Authorization, { code: 'KIT-NAT-OMN' }), ctx('k1'));
    expect(res.status).toBe(409);
  });

  it('allows saving a kit under its own unchanged code', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      kits: [{ id: 'k1', tenant_id: tenantId, code: 'KIT-NAT-DIR', nom: 'Directionnel', est_actif: true }],
      articles: articles(tenantId),
    });

    const res = await PUT(request('PUT', Authorization, { code: 'kit-nat-dir', nom: 'Renomme' }), ctx('k1'));
    expect(res.status).toBe(200);
  });

  it('refuses a nomenclature line pointing at another tenant article', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { ligneRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      kits: [{ id: 'k1', tenant_id: tenantId, code: 'KIT-NAT-DIR', nom: 'Directionnel', est_actif: true }],
      lignes: [{ id: 'l1', kit_id: 'k1', article_id: 'antenne', quantite: 1 }],
      articles: [{ id: 'etranger', tenant_id: 'autre-tenant', nom: 'Etranger', quantite_stock: 1, seuil_minimum: 0 }],
    });

    const res = await PUT(
      request('PUT', Authorization, { lignes: [{ article_id: 'etranger', quantite: 1 }] }),
      ctx('k1')
    );

    expect(res.status).toBe(400);
    // L'ancienne nomenclature n'a pas ete detruite par un remplacement refuse.
    expect(ligneRepo._all()).toHaveLength(1);
  });

  it('refuses a technicien editing a kit', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.TECHNICIEN as any });
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      kits: [{ id: 'k1', tenant_id: tenantId, code: 'KIT-NAT-DIR', nom: 'Directionnel', est_actif: true }],
      articles: articles(tenantId),
    });

    const res = await PUT(request('PUT', Authorization, { nom: 'Pirate' }), ctx('k1'));
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/kits/[id]', () => {
  it('removes the kit and its nomenclature lines', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { kitRepo, ligneRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      kits: [{ id: 'k1', tenant_id: tenantId, code: 'KIT-NAT-DIR', nom: 'Directionnel', est_actif: true }],
      lignes: [
        { id: 'l1', kit_id: 'k1', article_id: 'antenne', quantite: 1 },
        { id: 'l2', kit_id: 'autre-kit', article_id: 'cable', quantite: 40 },
      ],
    });

    const res = await DELETE(request('DELETE', Authorization), ctx('k1'));

    expect(res.status).toBe(204);
    expect(kitRepo._all()).toHaveLength(0);
    // Seules les lignes du kit supprime partent.
    expect(ligneRepo._all().map(l => l.id)).toEqual(['l2']);
  });

  it('refuses a manager deleting a kit', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.MANAGER as any });
    const { kitRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      kits: [{ id: 'k1', tenant_id: tenantId, code: 'KIT-NAT-DIR', nom: 'Directionnel', est_actif: true }],
    });

    const res = await DELETE(request('DELETE', Authorization), ctx('k1'));
    expect(res.status).toBe(403);
    expect(kitRepo._all()).toHaveLength(1);
  });

  it('refuses deleting a kit of another tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { kitRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      kits: [{ id: 'k1', tenant_id: 'autre-tenant', code: 'KIT-AUTRE', nom: 'Autre', est_actif: true }],
    });

    const res = await DELETE(request('DELETE', Authorization), ctx('k1'));
    expect(res.status).toBe(404);
    expect(kitRepo._all()).toHaveLength(1);
  });
});
