import { randomUUID } from 'crypto';

type WhereClause = Record<string, any> | Record<string, any>[];

function matchesOne(row: any, where: Record<string, any>): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return matchesOne(row[key] ?? {}, value);
    }
    return row[key] === value;
  });
}

function matchesWhere(row: any, where?: WhereClause): boolean {
  if (!where) return true;
  if (Array.isArray(where)) return where.some(w => matchesOne(row, w));
  return matchesOne(row, where);
}

export function createFakeRepo<T extends { id?: string; [key: string]: any }>(initial: T[] = []) {
  let rows: T[] = initial.map(r => ({ ...r }));

  return {
    find: async (opts?: { where?: WhereClause }) =>
      rows.filter(r => matchesWhere(r, opts?.where)).map(r => ({ ...r })),

    findOne: async (opts?: { where?: WhereClause }) => {
      const found = rows.find(r => matchesWhere(r, opts?.where));
      return found ? { ...found } : null;
    },

    count: async (opts?: { where?: WhereClause }) =>
      rows.filter(r => matchesWhere(r, opts?.where)).length,

    create: (data: Partial<T>) => ({ ...data }) as T,

    save: async (entity: T) => {
      if (!entity.id) entity.id = randomUUID();
      const idx = rows.findIndex(r => r.id === entity.id);
      const stored = { ...entity };
      if (idx === -1) rows.push(stored);
      else rows[idx] = stored;
      return { ...stored };
    },

    remove: async (entity: T) => {
      rows = rows.filter(r => r.id !== entity.id);
      return entity;
    },

    delete: async (where: WhereClause) => {
      rows = rows.filter(r => !matchesWhere(r, where));
    },

    // test-only helper to inspect state
    _all: () => rows.map(r => ({ ...r })),
  };
}

export type FakeRepo<T extends Record<string, any>> = ReturnType<typeof createFakeRepo<T>>;
