import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeRepo } from '../../../test/helpers/fakeDb';
import { makeAuthHeader } from '../../../test/helpers/authRequest';
import { UserRole } from '@/entities/User';
import { MouvementType } from '@/entities/Mouvement';

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/realtime', () => ({ publishChange: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/mailer', () => ({ sendStockAlertEmail: vi.fn().mockResolvedValue(undefined) }));

import { getDb } from '@/lib/db';
import { sendStockAlertEmail } from '@/lib/mailer';
import { GET, POST } from './route';

function makeRequest(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/mouvements', {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

function setupDb(opts: { tenants?: any[]; articles?: any[]; mouvements?: any[]; users?: any[] }) {
  const tenantRepo = createFakeRepo(opts.tenants ?? []);
  const articleRepo = createFakeRepo(opts.articles ?? []);
  const mouvementRepo = createFakeRepo(opts.mouvements ?? []);
  const userRepo = createFakeRepo(opts.users ?? []);
  vi.mocked(getDb).mockResolvedValue({
    getRepository: (entity: any) => {
      if (entity.name === 'Tenant') return tenantRepo as any;
      if (entity.name === 'Article') return articleRepo as any;
      if (entity.name === 'Mouvement') return mouvementRepo as any;
      if (entity.name === 'User') return userRepo as any;
      throw new Error(`Unexpected repo: ${entity.name}`);
    },
  } as any);
  return { tenantRepo, articleRepo, mouvementRepo, userRepo };
}

describe('POST /api/mouvements', () => {
  it('rejects a request with missing required fields', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({ tenants: [{ id: tenantId, is_active: true }] });
    const req = new NextRequest('http://localhost/api/mouvements', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({ type: 'ENTREE' }),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it('rejects an invalid mouvement type', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({ tenants: [{ id: tenantId, is_active: true }] });
    const req = new NextRequest('http://localhost/api/mouvements', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({ type: 'INVALID', quantite: 1, article_id: 'a1', utilisateur: 'Jane' }),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it('returns 404 when the article does not belong to the tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({ tenants: [{ id: tenantId, is_active: true }], articles: [] });
    const req = new NextRequest('http://localhost/api/mouvements', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({ type: 'ENTREE', quantite: 1, article_id: 'missing', utilisateur: 'Jane' }),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(404);
  });

  it('floors the stock at zero instead of going negative on a SORTIE', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { articleRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true, nom: 'ACME' }],
      articles: [{ id: 'a1', tenant_id: tenantId, nom: 'Câble RJ45', quantite_stock: 3, seuil_minimum: 1 }],
    });
    const req = new NextRequest('http://localhost/api/mouvements', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({ type: MouvementType.SORTIE, quantite: 10, article_id: 'a1', utilisateur: 'Jane' }),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(201);
    const [article] = articleRepo._all();
    expect(article.quantite_stock).toBe(0);
  });

  it('increases stock on an ENTREE', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const { articleRepo } = setupDb({
      tenants: [{ id: tenantId, is_active: true, nom: 'ACME' }],
      articles: [{ id: 'a1', tenant_id: tenantId, nom: 'Câble RJ45', quantite_stock: 3, seuil_minimum: 1 }],
    });
    const req = new NextRequest('http://localhost/api/mouvements', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({ type: MouvementType.ENTREE, quantite: 5, article_id: 'a1', utilisateur: 'Jane' }),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(201);
    const [article] = articleRepo._all();
    expect(article.quantite_stock).toBe(8);
  });

  it('sends a stock alert email to active admins/managers when stock becomes critical', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, is_active: true, nom: 'ACME' }],
      articles: [{ id: 'a1', tenant_id: tenantId, nom: 'Câble RJ45', quantite_stock: 5, seuil_minimum: 3 }],
      users: [
        { id: 'admin-1', tenant_id: tenantId, role: UserRole.ADMIN, is_active: true, email: 'admin@acme.com' },
        { id: 'mgr-1', tenant_id: tenantId, role: UserRole.MANAGER, is_active: true, email: 'mgr@acme.com' },
        { id: 'tech-1', tenant_id: tenantId, role: UserRole.TECHNICIEN, is_active: true, email: 'tech@acme.com' },
        { id: 'inactive-admin', tenant_id: tenantId, role: UserRole.ADMIN, is_active: false, email: 'gone@acme.com' },
      ],
    });
    const req = new NextRequest('http://localhost/api/mouvements', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({ type: MouvementType.SORTIE, quantite: 3, article_id: 'a1', utilisateur: 'Jane' }),
    });
    const res = await POST(req, {});
    expect(res.status).toBe(201);

    expect(sendStockAlertEmail).toHaveBeenCalledTimes(1);
    const [emails, tenantNom, articleNom, quantite, niveau] = vi.mocked(sendStockAlertEmail).mock.calls[0];
    expect(emails.sort()).toEqual(['admin@acme.com', 'mgr@acme.com']);
    expect(tenantNom).toBe('ACME');
    expect(articleNom).toBe('Câble RJ45');
    expect(quantite).toBe(2);
    expect(niveau).toBe('critique');
  });

  it('reports "rupture" instead of "critique" once stock hits zero', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, is_active: true, nom: 'ACME' }],
      articles: [{ id: 'a1', tenant_id: tenantId, nom: 'Câble RJ45', quantite_stock: 2, seuil_minimum: 3 }],
      users: [{ id: 'admin-1', tenant_id: tenantId, role: UserRole.ADMIN, is_active: true, email: 'admin@acme.com' }],
    });
    const req = new NextRequest('http://localhost/api/mouvements', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({ type: MouvementType.SORTIE, quantite: 5, article_id: 'a1', utilisateur: 'Jane' }),
    });
    await POST(req, {});
    const [, , , quantite, niveau] = vi.mocked(sendStockAlertEmail).mock.calls.at(-1)!;
    expect(quantite).toBe(0);
    expect(niveau).toBe('rupture');
  });

  it('does not send an alert email when stock stays comfortably above threshold', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, is_active: true, nom: 'ACME' }],
      articles: [{ id: 'a1', tenant_id: tenantId, nom: 'Câble RJ45', quantite_stock: 20, seuil_minimum: 3 }],
    });
    vi.mocked(sendStockAlertEmail).mockClear();
    const req = new NextRequest('http://localhost/api/mouvements', {
      method: 'POST',
      headers: { Authorization },
      body: JSON.stringify({ type: MouvementType.SORTIE, quantite: 1, article_id: 'a1', utilisateur: 'Jane' }),
    });
    await POST(req, {});
    expect(sendStockAlertEmail).not.toHaveBeenCalled();
  });
});

describe('GET /api/mouvements', () => {
  it('requires ADMIN or MANAGER role', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.TECHNICIEN as any });
    setupDb({ tenants: [{ id: tenantId, is_active: true }] });
    const req = new NextRequest('http://localhost/api/mouvements', { headers: { Authorization } });
    const res = await GET(req, {});
    expect(res.status).toBe(403);
  });

  it('returns only the mouvements scoped to the caller tenant', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      mouvements: [
        { id: 'm1', tenant_id: tenantId, utilisateur: 'Jane', created_at: new Date('2026-01-01') },
        { id: 'm2', tenant_id: 'other-tenant', utilisateur: 'Bob', created_at: new Date('2026-01-01') },
      ],
    });
    const req = new NextRequest('http://localhost/api/mouvements', { headers: { Authorization } });
    const res = await GET(req, {});
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toHaveLength(1);
    expect(data.items[0].id).toBe('m1');
    expect(data.total).toBe(1);
  });

  it('paginates results and reports total/totalPages', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    const mouvements = Array.from({ length: 5 }, (_, i) => ({
      id: `m${i}`,
      tenant_id: tenantId,
      utilisateur: 'Jane',
      created_at: new Date(2026, 0, i + 1),
    }));
    setupDb({ tenants: [{ id: tenantId, is_active: true }], mouvements });
    const req = new NextRequest('http://localhost/api/mouvements?page=2&limit=2', { headers: { Authorization } });
    const res = await GET(req, {});
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toHaveLength(2);
    expect(data.total).toBe(5);
    expect(data.page).toBe(2);
    expect(data.limit).toBe(2);
    expect(data.totalPages).toBe(3);
    // Ordered by created_at DESC: m4, m3, m2, m1, m0 -> page 2 (limit 2) = m2, m1
    expect(data.items.map((m: any) => m.id)).toEqual(['m2', 'm1']);
  });

  it('filters mouvements by date range', async () => {
    const { Authorization, tenantId } = makeAuthHeader({ role: UserRole.ADMIN as any });
    setupDb({
      tenants: [{ id: tenantId, is_active: true }],
      mouvements: [
        { id: 'old', tenant_id: tenantId, utilisateur: 'Jane', created_at: new Date('2026-01-01') },
        { id: 'recent', tenant_id: tenantId, utilisateur: 'Jane', created_at: new Date('2026-06-01') },
      ],
    });
    const req = new NextRequest('http://localhost/api/mouvements?startDate=2026-03-01T00:00:00.000Z&endDate=2026-12-31T00:00:00.000Z', { headers: { Authorization } });
    const res = await GET(req, {});
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toHaveLength(1);
    expect(data.items[0].id).toBe('recent');
  });
});
