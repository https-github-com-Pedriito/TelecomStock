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

describe('PUT /api/articles/[id] : stock et validation', () => {
  function put(id: string, Authorization: string, body: unknown) {
    return PUT(
      new NextRequest(`http://localhost/api/articles/${id}`, {
        method: 'PUT',
        headers: { Authorization },
        body: JSON.stringify(body),
      }),
      ctx(id)
    );
  }

  it('crée lui-même le mouvement quand le stock change (une seule fois)', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { articleRepo, mouvementRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      articles: [{ id: 'a1', tenant_id: tenantId, nom: 'Câble', quantite_stock: 5, seuil_minimum: 2 }],
    });
    const res = await put('a1', Authorization, { quantite_stock: 8 });
    expect(res.status).toBe(200);
    expect(articleRepo._all()[0].quantite_stock).toBe(8);
    const mouvements = mouvementRepo._all();
    expect(mouvements).toHaveLength(1);
    expect(mouvements[0]).toMatchObject({ type: 'ENTREE', quantite: 3, tenant_id: tenantId });
    expect(mouvements[0].commentaire).toContain('5 → 8');
  });

  it('crée une sortie quand le stock diminue', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { mouvementRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      articles: [{ id: 'a1', tenant_id: tenantId, nom: 'Câble', quantite_stock: 5 }],
    });
    await put('a1', Authorization, { quantite_stock: 1 });
    expect(mouvementRepo._all()[0]).toMatchObject({ type: 'SORTIE', quantite: 4 });
  });

  it('ne crée aucun mouvement si le stock est inchangé', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { mouvementRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      articles: [{ id: 'a1', tenant_id: tenantId, nom: 'Câble', quantite_stock: 5 }],
    });
    await put('a1', Authorization, { nom: 'Câble blindé', quantite_stock: 5 });
    expect(mouvementRepo._all()).toHaveLength(0);
  });

  it('ignore les champs non modifiables (id, tenant, dates)', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { articleRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      articles: [{ id: 'a1', tenant_id: tenantId, nom: 'Câble', quantite_stock: 5 }],
    });
    await put('a1', Authorization, { id: 'pirate', tenant_id: 'autre', created_at: '2000-01-01', nom: 'Câble 2' });
    const [article] = articleRepo._all();
    expect(article.id).toBe('a1');
    expect(article.tenant_id).toBe(tenantId);
    expect(article.created_at).toBeUndefined();
    expect(article.nom).toBe('Câble 2');
  });

  it.each([
    [{ quantite_stock: -1 }],
    [{ quantite_stock: 1.5 }],
    [{ quantite_stock: 'beaucoup' }],
    [{ seuil_minimum: -3 }],
    [{ nom: '   ' }],
    [{ prix_unitaire: -2 }],
  ])('refuse %j avec une 400 sans rien écrire', async body => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { articleRepo, mouvementRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      articles: [{ id: 'a1', tenant_id: tenantId, nom: 'Câble', quantite_stock: 5 }],
    });
    const res = await put('a1', Authorization, body);
    expect(res.status).toBe(400);
    expect(articleRepo._all()[0].quantite_stock).toBe(5);
    expect(mouvementRepo._all()).toHaveLength(0);
  });

  it('renvoie 404 pour un article d\'un autre tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      articles: [{ id: 'a1', tenant_id: 'autre', nom: 'Câble', quantite_stock: 5 }],
    });
    const res = await put('a1', Authorization, { quantite_stock: 9 });
    expect(res.status).toBe(404);
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
