import { NextRequest } from 'next/server';
import { requireAuth, requireTenant } from '@/lib/auth';
import { Redis } from '@upstash/redis';
import { currentSeq, eventsKey, readEventsSince } from '@/lib/realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Upstash Redis est un client REST — pas de pub/sub socket natif.
// publishChange pousse chaque evenement (numero de sequence croissant) dans une
// liste plafonnee par tenant ; chaque connexion relit cette liste avec son
// propre curseur, pour que tous les appareils recoivent tous les evenements.
// Le curseur survit a une reconnexion grace a l'en-tete Last-Event-ID.

export async function GET(request: NextRequest) {
  let auth;
  try {
    auth = requireAuth(request);
  } catch {
    return Response.json({ message: 'Non authentifié' }, { status: 401 });
  }

  const tenantId = requireTenant(auth);
  const listKey = eventsKey(tenantId);

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      const lastEventId = Number(request.headers.get('last-event-id'));
      let cursor: number;
      try {
        cursor = Number.isFinite(lastEventId) && lastEventId > 0 ? lastEventId : await currentSeq(redis, tenantId);
      } catch {
        controller.close();
        return;
      }

      while (!closed) {
        try {
          const events = await readEventsSince(redis, listKey, cursor);
          if (events.length > 0) {
            for (const event of events) {
              controller.enqueue(encoder.encode(`id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`));
            }
            cursor = events[events.length - 1].seq;
          } else {
            // Rien de neuf — attendre 2 secondes avant de re-poll
            await new Promise(r => setTimeout(r, 2000));
          }
        } catch {
          break;
        }
      }
      controller.close();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
