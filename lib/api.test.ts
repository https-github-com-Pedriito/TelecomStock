import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/tokenManager', () => ({
  getToken: () => 'jeton',
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({ logger: {}, logApiRequest: vi.fn() }));
vi.mock('@/lib/amplitude', () => ({ track: vi.fn() }));
import { track } from '@/lib/amplitude';

import { api } from './api';

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => {
    await new Promise(r => setTimeout(r, 10));
    return jsonResponse({ ok: true });
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe('ApiService : fusion des requêtes en cours', () => {
  it('fusionne deux lectures identiques simultanées', async () => {
    await Promise.all([api.get('/articles-a'), api.get('/articles-a')]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('n\'avale jamais une écriture identique : deux clics = deux requêtes', async () => {
    const mouvement = { type: 'ENTREE', quantite: 1, article_id: 'a1', utilisateur: 'Moi' };
    await Promise.all([api.post('/mouvements', mouvement), api.post('/mouvements', mouvement)]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('une écriture réussie invalide les lectures en cache', async () => {
    await api.get('/articles-b');
    await api.post('/mouvements', { a: 1 });
    await api.get('/articles-b');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('ApiService : suivi des refus pour stock insuffisant', () => {
  it('trace un refus 409 STOCK_INSUFFISANT avec sa portée (kit ou article)', async () => {
    vi.mocked(track).mockClear();
    fetchMock.mockImplementation(async () =>
      new Response(JSON.stringify({ message: 'Stock insuffisant', code: 'STOCK_INSUFFISANT' }), { status: 409 }),
    );
    await expect(api.post('/kits/mouvement', {})).rejects.toThrow('Stock insuffisant');
    await expect(api.post('/mouvements', {})).rejects.toThrow('Stock insuffisant');
    expect(vi.mocked(track).mock.calls).toEqual([
      ['Insufficient Stock Rejected', { scope: 'kit' }],
      ['Insufficient Stock Rejected', { scope: 'article' }],
    ]);
  });

  it('ne trace pas les autres erreurs 409', async () => {
    vi.mocked(track).mockClear();
    fetchMock.mockImplementation(async () =>
      new Response(JSON.stringify({ message: 'Doublon', code: 'DOUBLON' }), { status: 409 }),
    );
    await expect(api.post('/articles', {})).rejects.toThrow('Doublon');
    expect(track).not.toHaveBeenCalled();
  });
});
