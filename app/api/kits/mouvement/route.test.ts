import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeRepo, createFakeDataSource } from '../../../../test/helpers/fakeDb';
import { makeAuthHeader } from '../../../../test/helpers/authRequest';
import { UserRole } from '@/entities/User';
import { MAX_KITS_PAR_MOUVEMENT } from '@/lib/kits';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/realtime', () => ({ publishChange: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/mailer', () => ({ sendStockAlertEmail: vi.fn().mockResolvedValue(undefined) }));

import { getDb } from '@/lib/db';
import { sendStockAlertEmail } from '@/lib/mailer';
import { POST } from './route';

/** Le kit lui-meme. Ses lignes vivent dans la table kit_lignes (cf. lignesDirectionnel). */
function kitDirectionnel(tenantId: string | null) {
  return {
    id: 'kit-dir',
    tenant_id: tenantId,
    code: 'KIT-NAT-DIR',
    nom: 'Kit antenne directionnelle',
    est_actif: true,
  };
}

/** Nomenclature de l'exemple métier : 1 kit directionnel. */
function lignesDirectionnel() {
  return [
    { id: 'l1', kit_id: 'kit-dir', article_id: 'antenne', quantite: 1 },
    { id: 'l2', kit_id: 'kit-dir', article_id: 'manchon', quantite: 2 },
    { id: 'l3', kit_id: 'kit-dir', article_id: 'collier', quantite: 1 },
    { id: 'l4', kit_id: 'kit-dir', article_id: 'cable', quantite: 40 },
    { id: 'l5', kit_id: 'kit-dir', article_id: 'connecteur', quantite: 4 },
  ];
}

function articlesEnStock(tenantId: string | null) {
  return [
    { id: 'antenne', tenant_id: tenantId, nom: 'Antenne directionnelle', quantite_stock: 10, seuil_minimum: 2 },
    { id: 'manchon', tenant_id: tenantId, nom: 'Manchon', quantite_stock: 20, seuil_minimum: 4 },
    { id: 'collier', tenant_id: tenantId, nom: 'Collier', quantite_stock: 15, seuil_minimum: 3 },
    { id: 'cable', tenant_id: tenantId, nom: 'Cable coaxial (m)', quantite_stock: 500, seuil_minimum: 100 },
    { id: 'connecteur', tenant_id: tenantId, nom: 'Connecteur N', quantite_stock: 40, seuil_minimum: 10 },
  ];
}

function setupDb(opts: { tenants?: any[]; kits?: any[]; kitLignes?: any[]; articles?: any[]; users?: any[] }) {
  const tenantRepo = createFakeRepo(opts.tenants ?? []);
  const kitRepo = createFakeRepo(opts.kits ?? []);
  // Les lignes sont lues dans leur propre table : Kit ne porte plus de
  // @OneToMany (cf. entities/Kit.ts). Par defaut on sert la nomenclature
  // directionnelle, que la quasi-totalite des scenarios utilise.
  const kitLigneRepo = createFakeRepo(opts.kitLignes ?? lignesDirectionnel());
  const articleRepo = createFakeRepo(opts.articles ?? []);
  const mouvementRepo = createFakeRepo([] as any[]);
  const userRepo = createFakeRepo(opts.users ?? []);
  vi.mocked(getDb).mockResolvedValue(
    createFakeDataSource({
      Tenant: tenantRepo,
      Kit: kitRepo,
      KitLigne: kitLigneRepo,
      Article: articleRepo,
      Mouvement: mouvementRepo,
      User: userRepo,
    }) as any
  );
  return { tenantRepo, kitRepo, kitLigneRepo, articleRepo, mouvementRepo, userRepo };
}

function makeRequest(Authorization: string, body: unknown) {
  return new NextRequest('http://localhost/api/kits/mouvement', {
    method: 'POST',
    headers: { Authorization },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(sendStockAlertEmail).mockClear();
});

describe('POST /api/kits/mouvement', () => {
  it('deducts every component of the BOM for 2 kits', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { articleRepo, mouvementRepo } = setupDb({
      tenants: [{ id: tenantId, nom: 'Acme', is_active: true }],
      kits: [kitDirectionnel(tenantId)],
      articles: articlesEnStock(tenantId),
    });

    const res = await POST(
      makeRequest(Authorization, {
        code: 'KIT-NAT-DIR',
        quantite: 2,
        type: 'SORTIE',
        utilisateur: 'Jane Doe',
      }),
      {}
    );

    expect(res.status).toBe(201);

    // 2 kits -> 2 antennes, 4 manchons, 2 colliers, 80 m de cable, 8 connecteurs.
    const stock = Object.fromEntries(articleRepo._all().map(a => [a.id, a.quantite_stock]));
    expect(stock).toEqual({
      antenne: 8,
      manchon: 16,
      collier: 13,
      cable: 420,
      connecteur: 32,
    });

    // Un mouvement trace par composant.
    expect(mouvementRepo._all()).toHaveLength(5);
    expect(mouvementRepo._all().every(m => m.type === 'SORTIE')).toBe(true);
    expect(mouvementRepo._all()[0].commentaire).toContain('KIT-NAT-DIR');
  });

  it('adds stock back on an ENTREE', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { articleRepo } = setupDb({
      tenants: [{ id: tenantId, nom: 'Acme', is_active: true }],
      kits: [kitDirectionnel(tenantId)],
      articles: articlesEnStock(tenantId),
    });

    const res = await POST(
      makeRequest(Authorization, { code: 'KIT-NAT-DIR', quantite: 1, type: 'ENTREE', utilisateur: 'Jane Doe' }),
      {}
    );

    expect(res.status).toBe(201);
    const stock = Object.fromEntries(articleRepo._all().map(a => [a.id, a.quantite_stock]));
    expect(stock.antenne).toBe(11);
    expect(stock.cable).toBe(540);
  });

  it('refuses the whole exit when one component is short, leaving stock untouched', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const articles = articlesEnStock(tenantId);
    articles.find(a => a.id === 'cable')!.quantite_stock = 50; // il en faut 80
    const { articleRepo, mouvementRepo } = setupDb({
      tenants: [{ id: tenantId, nom: 'Acme', is_active: true }],
      kits: [kitDirectionnel(tenantId)],
      articles,
    });

    const res = await POST(
      makeRequest(Authorization, { code: 'KIT-NAT-DIR', quantite: 2, type: 'SORTIE', utilisateur: 'Jane Doe' }),
      {}
    );

    expect(res.status).toBe(409);
    const payload = await res.json();
    expect(payload.code).toBe('STOCK_INSUFFISANT');
    expect(payload.manques).toEqual([
      { article_id: 'cable', nom: 'Cable coaxial (m)', requis: 80, disponible: 50 },
    ]);

    // Rien ne bouge : pas de sortie partielle.
    expect(articleRepo._all().find(a => a.id === 'antenne')!.quantite_stock).toBe(10);
    expect(mouvementRepo._all()).toHaveLength(0);
  });

  it('forces the exit when force is set, clamping stock at zero', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const articles = articlesEnStock(tenantId);
    articles.find(a => a.id === 'cable')!.quantite_stock = 50;
    const { articleRepo } = setupDb({
      tenants: [{ id: tenantId, nom: 'Acme', is_active: true }],
      kits: [kitDirectionnel(tenantId)],
      articles,
    });

    const res = await POST(
      makeRequest(Authorization, {
        code: 'KIT-NAT-DIR',
        quantite: 2,
        type: 'SORTIE',
        utilisateur: 'Jane Doe',
        force: true,
      }),
      {}
    );

    expect(res.status).toBe(201);
    expect(articleRepo._all().find(a => a.id === 'cable')!.quantite_stock).toBe(0);
  });

  it('emails admins and managers for each component that falls under its threshold', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const articles = articlesEnStock(tenantId);
    articles.find(a => a.id === 'antenne')!.quantite_stock = 3; // seuil 2 -> 1 restante apres 2 kits
    setupDb({
      tenants: [{ id: tenantId, nom: 'Acme', is_active: true }],
      kits: [kitDirectionnel(tenantId)],
      articles,
      users: [
        { id: 'u1', tenant_id: tenantId, email: 'admin@acme.fr', role: UserRole.ADMIN, is_active: true },
        { id: 'u2', tenant_id: tenantId, email: 'manager@acme.fr', role: UserRole.MANAGER, is_active: true },
      ],
    });

    const res = await POST(
      makeRequest(Authorization, { code: 'KIT-NAT-DIR', quantite: 2, type: 'SORTIE', utilisateur: 'Jane Doe' }),
      {}
    );

    expect(res.status).toBe(201);
    expect(sendStockAlertEmail).toHaveBeenCalledTimes(1);
    const [emails, tenantNom, articleNom, quantite, niveau] = vi.mocked(sendStockAlertEmail).mock.calls[0];
    expect(emails).toEqual(['admin@acme.fr', 'manager@acme.fr']);
    expect(tenantNom).toBe('Acme');
    expect(articleNom).toBe('Antenne directionnelle');
    expect(quantite).toBe(1);
    expect(niveau).toBe('critique');
  });

  it('sends no email when every component stays above its threshold', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, nom: 'Acme', is_active: true }],
      kits: [kitDirectionnel(tenantId)],
      articles: articlesEnStock(tenantId),
      users: [{ id: 'u1', tenant_id: tenantId, email: 'admin@acme.fr', role: UserRole.ADMIN, is_active: true }],
    });

    await POST(
      makeRequest(Authorization, { code: 'KIT-NAT-DIR', quantite: 1, type: 'SORTIE', utilisateur: 'Jane Doe' }),
      {}
    );

    expect(sendStockAlertEmail).not.toHaveBeenCalled();
  });

  it('matches the kit code case-insensitively', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, nom: 'Acme', is_active: true }],
      kits: [kitDirectionnel(tenantId)],
      articles: articlesEnStock(tenantId),
    });

    const res = await POST(
      makeRequest(Authorization, { code: 'kit-nat-dir', quantite: 1, type: 'SORTIE', utilisateur: 'Jane Doe' }),
      {}
    );
    expect(res.status).toBe(201);
  });

  it('returns 404 for an unknown kit code', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, nom: 'Acme', is_active: true }],
      kits: [kitDirectionnel(tenantId)],
      articles: articlesEnStock(tenantId),
    });

    const res = await POST(
      makeRequest(Authorization, { code: 'KIT-INCONNU', quantite: 1, type: 'SORTIE', utilisateur: 'Jane Doe' }),
      {}
    );
    expect(res.status).toBe(404);
  });

  it('refuses a deactivated kit', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const kit = { ...kitDirectionnel(tenantId), est_actif: false };
    setupDb({
      tenants: [{ id: tenantId, nom: 'Acme', is_active: true }],
      kits: [kit],
      articles: articlesEnStock(tenantId),
    });

    const res = await POST(
      makeRequest(Authorization, { code: 'KIT-NAT-DIR', quantite: 1, type: 'SORTIE', utilisateur: 'Jane Doe' }),
      {}
    );
    expect(res.status).toBe(409);
  });

  it('rejects a non-integer kit count', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, nom: 'Acme', is_active: true }],
      kits: [kitDirectionnel(tenantId)],
      articles: articlesEnStock(tenantId),
    });

    const res = await POST(
      makeRequest(Authorization, { code: 'KIT-NAT-DIR', quantite: 1.5, type: 'SORTIE', utilisateur: 'Jane Doe' }),
      {}
    );
    expect(res.status).toBe(400);
  });

  it('refuses a technicien forcing an exit past available stock', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.TECHNICIEN as any });
    const articles = articlesEnStock(tenantId);
    articles.find(a => a.id === 'cable')!.quantite_stock = 0;
    const { articleRepo } = setupDb({
      tenants: [{ id: tenantId, nom: 'Acme', is_active: true }],
      kits: [kitDirectionnel(tenantId)],
      articles,
    });

    const res = await POST(
      makeRequest(Authorization, {
        code: 'KIT-NAT-DIR', quantite: 1, type: 'SORTIE', utilisateur: 'Tech', force: true,
      }),
      {}
    );

    expect(res.status).toBe(403);
    // Aucune ecriture : le refus intervient avant la transaction.
    expect(articleRepo._all().find(a => a.id === 'antenne')!.quantite_stock).toBe(10);
  });

  it('rejects a kit count above the int4 safety cap', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, nom: 'Acme', is_active: true }],
      kits: [kitDirectionnel(tenantId)],
      articles: articlesEnStock(tenantId),
    });

    const res = await POST(
      makeRequest(Authorization, {
        code: 'KIT-NAT-DIR', quantite: MAX_KITS_PAR_MOUVEMENT + 1, type: 'ENTREE', utilisateur: 'Jane Doe',
      }),
      {}
    );
    expect(res.status).toBe(400);
  });

  it('ignores a component belonging to another tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const articles = articlesEnStock(tenantId);
    // Le cable appartient a un AUTRE tenant : la nomenclature le reference
    // encore, mais il ne doit jamais etre decremente depuis ce compte.
    articles.find(a => a.id === 'cable')!.tenant_id = 'autre-tenant';
    const { articleRepo } = setupDb({
      tenants: [{ id: tenantId, nom: 'Acme', is_active: true }],
      kits: [kitDirectionnel(tenantId)],
      articles,
    });

    const res = await POST(
      makeRequest(Authorization, { code: 'KIT-NAT-DIR', quantite: 1, type: 'SORTIE', utilisateur: 'Jane Doe' }),
      {}
    );

    expect(res.status).toBe(400);
    expect(articleRepo._all().find(a => a.id === 'cable')!.quantite_stock).toBe(500);
    expect(articleRepo._all().find(a => a.id === 'antenne')!.quantite_stock).toBe(10);
  });

  it('lets a technicien record a kit movement', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.TECHNICIEN as any });
    setupDb({
      tenants: [{ id: tenantId, nom: 'Acme', is_active: true }],
      kits: [kitDirectionnel(tenantId)],
      articles: articlesEnStock(tenantId),
    });

    const res = await POST(
      makeRequest(Authorization, { code: 'KIT-NAT-DIR', quantite: 1, type: 'SORTIE', utilisateur: 'Tech' }),
      {}
    );
    expect(res.status).toBe(201);
  });
});
