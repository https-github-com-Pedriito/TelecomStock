import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  // Pas de nouvelles tentatives avec attente : si Redis est indisponible, la
  // publication echoue vite (elle est deja sans consequence pour la requete).
  retry: false,
});

/**
 * Temps reel par liste Redis plafonnee + compteur de sequence.
 *
 * Upstash est un client REST : pas de pub/sub socket. Chaque evenement recoit
 * un numero de sequence croissant et est pousse en tete d'une liste courte.
 * Chaque connexion SSE garde son propre curseur (le dernier numero vu) et relit
 * la liste : tous les appareils d'un meme tenant recoivent donc tous les
 * evenements, contrairement a un RPOP ou le premier lecteur « vole » l'evenement.
 */
export const MAX_EVENTS = 50;
const EVENTS_TTL_SECONDS = 3600;

export interface RealtimeEvent {
  seq: number;
  table: string;
  type: 'create' | 'update' | 'delete';
  timestamp: string;
}

export function eventsKey(tenantId: string | null): string {
  return tenantId ? `tenant:${tenantId}:events` : 'super_admin:events';
}

/** Cle du compteur : jamais expiree, sinon la sequence repartirait de 0 sous les curseurs des clients. */
export function seqKey(tenantId: string | null): string {
  return `${eventsKey(tenantId)}:seq`;
}

export async function publishChange(
  tenantId: string | null,
  table: string,
  type: RealtimeEvent['type'],
  // Conserve pour compatibilite des appelants : le client se resynchronise par
  // API, la charge utile n'est donc ni stockee ni diffusee.
  _data?: unknown
) {
  try {
    const seq = await redis.incr(seqKey(tenantId));
    const event: RealtimeEvent = { seq, table, type, timestamp: new Date().toISOString() };
    const key = eventsKey(tenantId);
    await redis
      .pipeline()
      .lpush(key, JSON.stringify(event))
      .ltrim(key, 0, MAX_EVENTS - 1)
      .expire(key, EVENTS_TTL_SECONDS)
      .exec();
  } catch {
    // Redis failure must not break the request
  }
}

function parseEvent(raw: unknown): RealtimeEvent | null {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (value && typeof value === 'object' && typeof (value as RealtimeEvent).seq === 'number') {
      return value as RealtimeEvent;
    }
  } catch {
    /* entree illisible : ignoree */
  }
  return null;
}

/** Evenements strictement posterieurs au curseur, du plus ancien au plus recent. */
export async function readEventsSince(
  client: Pick<Redis, 'lrange'>,
  key: string,
  cursor: number
): Promise<RealtimeEvent[]> {
  const raw = await client.lrange(key, 0, MAX_EVENTS - 1);
  return raw
    .map(parseEvent)
    .filter((e): e is RealtimeEvent => e !== null && e.seq > cursor)
    .sort((a, b) => a.seq - b.seq);
}

/** Curseur initial d'une nouvelle connexion : seuls les evenements futurs l'interessent. */
export async function currentSeq(client: Pick<Redis, 'get'>, tenantId: string | null): Promise<number> {
  return Number(await client.get(seqKey(tenantId))) || 0;
}
