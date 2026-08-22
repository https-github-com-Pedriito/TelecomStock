import { randomUUID } from 'crypto';
import { FindOperator } from 'typeorm';

type WhereClause = Record<string, any> | Record<string, any>[];
type OrderClause = Record<string, 'ASC' | 'DESC'>;

function matchesOperator(fieldValue: any, op: FindOperator<any>): boolean {
  const toComparable = (v: any) => (v instanceof Date ? v.getTime() : v);
  const fv = toComparable(fieldValue);
  switch (op.type) {
    case 'between': {
      const [start, end] = op.value as any[];
      return fv >= toComparable(start) && fv <= toComparable(end);
    }
    case 'moreThanOrEqual':
      return fv >= toComparable(op.value);
    case 'lessThanOrEqual':
      return fv <= toComparable(op.value);
    case 'moreThan':
      return fv > toComparable(op.value);
    case 'lessThan':
      return fv < toComparable(op.value);
    default:
      return true;
  }
}

function matchesOne(row: any, where: Record<string, any>): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (value instanceof FindOperator) {
      return matchesOperator(row[key], value);
    }
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

function applyOrder<T extends Record<string, any>>(rows: T[], order?: OrderClause): T[] {
  if (!order) return rows;
  const entries = Object.entries(order);
  return [...rows].sort((a, b) => {
    for (const [key, dir] of entries) {
      const av = a[key] instanceof Date ? a[key].getTime() : a[key];
      const bv = b[key] instanceof Date ? b[key].getTime() : b[key];
      let cmp = 0;
      if (av < bv) cmp = -1;
      else if (av > bv) cmp = 1;
      if (cmp !== 0) return dir === 'ASC' ? cmp : -cmp;
    }
    return 0;
  });
}

function applyPagination<T>(rows: T[], opts?: { skip?: number; take?: number }): T[] {
  if (opts?.skip === undefined && opts?.take === undefined) return rows;
  const skip = opts?.skip ?? 0;
  const take = opts?.take ?? rows.length;
  return rows.slice(skip, skip + take);
}

export function createFakeRepo<T extends { id?: string; [key: string]: any }>(initial: T[] = []) {
  let rows: T[] = initial.map(r => ({ ...r }));

  type FindOpts = { where?: WhereClause; order?: OrderClause; skip?: number; take?: number };

  const findMatching = (opts?: FindOpts) => rows.filter(r => matchesWhere(r, opts?.where)).map(r => ({ ...r }));

  return {
    find: async (opts?: FindOpts) => applyPagination(applyOrder(findMatching(opts), opts?.order), opts),

    findAndCount: async (opts?: FindOpts): Promise<[T[], number]> => {
      const matched = findMatching(opts);
      const ordered = applyOrder(matched, opts?.order);
      return [applyPagination(ordered, opts), matched.length];
    },

    findOne: async (opts?: { where?: WhereClause }) => {
      const found = rows.find(r => matchesWhere(r, opts?.where));
      return found ? { ...found } : null;
    },

    count: async (opts?: { where?: WhereClause }) =>
      rows.filter(r => matchesWhere(r, opts?.where)).length,

    create: (data: Partial<T>) => ({ ...data }) as T,

    save: (async (entityOrEntities: T | T[]) => {
      const saveOne = (entity: T) => {
        if (!entity.id) entity.id = randomUUID();
        const idx = rows.findIndex(r => r.id === entity.id);
        const stored = { ...entity };
        if (idx === -1) rows.push(stored);
        else rows[idx] = stored;
        return { ...stored };
      };
      if (Array.isArray(entityOrEntities)) return entityOrEntities.map(saveOne);
      return saveOne(entityOrEntities);
    }) as { (entity: T): Promise<T>; (entities: T[]): Promise<T[]> },

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
