import { beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshTargets } from './realtimeRefresh';

// Faux Redis en memoire : list + compteurs, avec le sous-ensemble utilise.
const store = vi.hoisted(() => ({
  lists: new Map<string, string[]>(),
  counters: new Map<string, number>(),
  expires: new Map<string, number>(),
  fail: false,
}));

vi.mock('@upstash/redis', () => ({
  Redis: class {
    async incr(key: string) {
      if (store.fail) throw new Error('redis down');
      const next = (store.counters.get(key) ?? 0) + 1;
      store.counters.set(key, next);
      return next;
    }
    async get(key: string) {
      return store.counters.get(key) ?? null;
    }
    async lrange(key: string, start: number, stop: number) {
      return (store.lists.get(key) ?? []).slice(start, stop + 1);
    }
    pipeline() {
      const ops: Array<() => void> = [];
      const chain = {
        lpush: (key: string, value: string) => {
          ops.push(() => store.lists.set(key, [value, ...(store.lists.get(key) ?? [])]));
          return chain;
        },
        ltrim: (key: string, start: number, stop: number) => {
          ops.push(() => store.lists.set(key, (store.lists.get(key) ?? []).slice(start, stop + 1)));
          return chain;
        },
        expire: (key: string, seconds: number) => {
          ops.push(() => store.expires.set(key, seconds));
          return chain;
        },
        exec: async () => ops.forEach(op => op()),
      };
      return chain;
    }
  },
}));

import {
  MAX_EVENTS,
  currentSeq,
  eventsKey,
  publishChange,
  readEventsSince,
  seqKey,
} from './realtime';

const redis = new (await import('@upstash/redis')).Redis({ url: 'x', token: 'y' });

beforeEach(() => {
  store.lists.clear();
  store.counters.clear();
  store.expires.clear();
  store.fail = false;
});

describe('publishChange / readEventsSince', () => {
  it('numerote les evenements et les relit dans l\'ordre', async () => {
    await publishChange('t1', 'mouvement', 'create');
    await publishChange('t1', 'article', 'update');

    const events = await readEventsSince(redis, eventsKey('t1'), 0);
    expect(events.map(e => [e.seq, e.table, e.type])).toEqual([
      [1, 'mouvement', 'create'],
      [2, 'article', 'update'],
    ]);
  });

  it('ne rend que les evenements posterieurs au curseur', async () => {
    await publishChange('t1', 'article', 'create');
    await publishChange('t1', 'article', 'update');
    await publishChange('t1', 'mouvement', 'create');

    const events = await readEventsSince(redis, eventsKey('t1'), 2);
    expect(events.map(e => e.seq)).toEqual([3]);
  });

  it('chaque lecteur garde son curseur : aucun evenement n\'est « vole »', async () => {
    await publishChange('t1', 'mouvement', 'create');

    const telephone = await readEventsSince(redis, eventsKey('t1'), 0);
    const bureau = await readEventsSince(redis, eventsKey('t1'), 0);
    expect(telephone).toHaveLength(1);
    expect(bureau).toHaveLength(1);
  });

  it('isole les tenants entre eux', async () => {
    await publishChange('t1', 'article', 'create');
    expect(await readEventsSince(redis, eventsKey('t2'), 0)).toEqual([]);
  });

  it('plafonne la liste et lui donne une expiration', async () => {
    for (let i = 0; i < MAX_EVENTS + 10; i++) await publishChange('t1', 'article', 'update');

    const events = await readEventsSince(redis, eventsKey('t1'), 0);
    expect(events).toHaveLength(MAX_EVENTS);
    expect(events[events.length - 1].seq).toBe(MAX_EVENTS + 10);
    expect(store.expires.get(eventsKey('t1'))).toBeGreaterThan(0);
  });

  it('n\'expire jamais le compteur de sequence', async () => {
    await publishChange('t1', 'article', 'create');
    expect(store.expires.has(seqKey('t1'))).toBe(false);
  });

  it('utilise la liste super admin sans tenant', async () => {
    await publishChange(null, 'article', 'create');
    expect(await readEventsSince(redis, 'super_admin:events', 0)).toHaveLength(1);
  });

  it('ne fait jamais echouer la requete si Redis est indisponible', async () => {
    store.fail = true;
    await expect(publishChange('t1', 'article', 'create')).resolves.toBeUndefined();
  });

  it('ignore les entrees illisibles', async () => {
    store.lists.set(eventsKey('t1'), ['pas du json', JSON.stringify({ seq: 5, table: 'article', type: 'update' })]);
    const events = await readEventsSince(redis, eventsKey('t1'), 0);
    expect(events.map(e => e.seq)).toEqual([5]);
  });
});

describe('currentSeq', () => {
  it('vaut 0 sans evenement, puis le dernier numero publie', async () => {
    expect(await currentSeq(redis, 't1')).toBe(0);
    await publishChange('t1', 'article', 'create');
    await publishChange('t1', 'article', 'create');
    expect(await currentSeq(redis, 't1')).toBe(2);
  });
});

describe('refreshTargets', () => {
  it.each([
    ['mouvement', { articles: true, mouvements: true, fournisseurs: false }],
    ['mouvements', { articles: true, mouvements: true, fournisseurs: false }],
    ['article', { articles: true, mouvements: false, fournisseurs: false }],
    ['articles', { articles: true, mouvements: false, fournisseurs: false }],
    ['fournisseur', { articles: false, mouvements: false, fournisseurs: true }],
    ['kit', { articles: false, mouvements: false, fournisseurs: false }],
  ])('%s', (table, expected) => {
    expect(refreshTargets(table)).toEqual(expected);
  });
});
