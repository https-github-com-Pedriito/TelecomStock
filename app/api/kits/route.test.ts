import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeRepo, createFakeDataSource } from '../../../test/helpers/fakeDb';
import { makeAuthHeader } from '../../../test/helpers/authRequest';
import { UserRole } from '@/entities/User';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/realtime', () => ({ publishChange: vi.fn().mockResolvedValue(undefined) }));

import { getDb } from '@/lib/db';
import { GET, POST } from './route';

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

function postRequest(Authorization: string, body: unknown) {
  return new NextRequest('http://localhost/api/kits', {
    method: 'POST',
    headers: { Authorization },
    body: JSON.stringify(body),
  });
}

describe('GET /api/kits', () => {
  it('returns only the kits of the caller tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.TECHNICIEN as any });
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      kits: [
        { id: 'k1', tenant_id: tenantId, code: 'KIT-NAT-DIR', nom: 'Directionnel', est_actif: true },
        { id: 'k2', tenant_id: 'autre-tenant', code: 'KIT-AUTRE', nom: 'Autre', est_actif: true },
      ],
    });

    const res = await GET(
      new NextRequest('http://localhost/api/kits', { headers: { Authorization } }),
      {}
    );

    expect(res.status).toBe(200);
    const kits = await res.json();
    expect(kits.map((k: any) => k.code)).toEqual(['KIT-NAT-DIR']);
  });
});

describe('POST /api/kits', () => {
  it('creates a kit and its nomenclature lines', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.MANAGER as any });
    const { kitRepo, ligneRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      articles: articles(tenantId),
    });

    const res = await POST(
      postRequest(Authorization, {
        code: 'kit-nat-dir',
        nom: 'Kit antenne directionnelle',
        lignes: [
          { article_id: 'antenne', quantite: 1 },
          { article_id: 'cable', quantite: 40 },
        ],
      }),
      {}
    );

    expect(res.status).toBe(201);
    // Le code est normalise en majuscules a l'ecriture.
    expect(kitRepo._all()[0].code).toBe('KIT-NAT-DIR');
    expect(kitRepo._all()[0].tenant_id).toBe(tenantId);
    expect(ligneRepo._all()).toHaveLength(2);
    expect(ligneRepo._all().map(l => l.quantite).sort((a, b) => a - b)).toEqual([1, 40]);
  });

  it('refuses a duplicate code within the same tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      kits: [{ id: 'k1', tenant_id: tenantId, code: 'KIT-NAT-DIR', nom: 'Existant', est_actif: true }],
      articles: articles(tenantId),
    });

    const res = await POST(
      postRequest(Authorization, {
        code: 'KIT-NAT-DIR',
        nom: 'Doublon',
        lignes: [{ article_id: 'antenne', quantite: 1 }],
      }),
      {}
    );
    expect(res.status).toBe(409);
  });

  it('accepts the same code in a different tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { kitRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      kits: [{ id: 'k1', tenant_id: 'autre-tenant', code: 'KIT-NAT-DIR', nom: 'Chez un autre', est_actif: true }],
      articles: articles(tenantId),
    });

    const res = await POST(
      postRequest(Authorization, {
        code: 'KIT-NAT-DIR',
        nom: 'Le mien',
        lignes: [{ article_id: 'antenne', quantite: 1 }],
      }),
      {}
    );
    expect(res.status).toBe(201);
    expect(kitRepo._all()).toHaveLength(2);
  });

  it('refuses a nomenclature referencing an article of another tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { kitRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      articles: [{ id: 'antenne', tenant_id: 'autre-tenant', nom: 'Antenne', quantite_stock: 10, seuil_minimum: 0 }],
    });

    const res = await POST(
      postRequest(Authorization, {
        code: 'KIT-X',
        nom: 'Kit',
        lignes: [{ article_id: 'antenne', quantite: 1 }],
      }),
      {}
    );

    expect(res.status).toBe(400);
    expect(kitRepo._all()).toHaveLength(0);
  });

  it('refuses an empty nomenclature', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({ tenants: [{ id: tenantId, is_active: true }], articles: articles(tenantId) });

    const res = await POST(postRequest(Authorization, { code: 'KIT-X', nom: 'Kit', lignes: [] }), {});
    expect(res.status).toBe(400);
  });

  it('refuses a zero or fractional line quantity', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({ tenants: [{ id: tenantId, is_active: true }], articles: articles(tenantId) });

    for (const quantite of [0, -1, 1.5]) {
      const res = await POST(
        postRequest(Authorization, {
          code: 'KIT-X',
          nom: 'Kit',
          lignes: [{ article_id: 'antenne', quantite }],
        }),
        {}
      );
      expect(res.status).toBe(400);
    }
  });

  it('refuses a missing code or name', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({ tenants: [{ id: tenantId, is_active: true }], articles: articles(tenantId) });

    const sansCode = await POST(
      postRequest(Authorization, { nom: 'Kit', lignes: [{ article_id: 'antenne', quantite: 1 }] }),
      {}
    );
    expect(sansCode.status).toBe(400);

    const sansNom = await POST(
      postRequest(Authorization, { code: 'KIT-X', lignes: [{ article_id: 'antenne', quantite: 1 }] }),
      {}
    );
    expect(sansNom.status).toBe(400);
  });

  it('refuses a technicien creating a kit', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.TECHNICIEN as any });
    const { kitRepo } = setupDb({ tenants: [{ id: tenantId, is_active: true }], articles: articles(tenantId) });

    const res = await POST(
      postRequest(Authorization, {
        code: 'KIT-X',
        nom: 'Kit',
        lignes: [{ article_id: 'antenne', quantite: 1 }],
      }),
      {}
    );

    expect(res.status).toBe(403);
    expect(kitRepo._all()).toHaveLength(0);
  });
});
