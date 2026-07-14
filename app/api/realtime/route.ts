import { NextRequest } from 'next/server';
import { requireAuth, requireTenant } from '@/lib/auth';
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Upstash Redis est un client REST — pas de pub/sub socket natif.
// On publie avec LPUSH et on poll avec RPOP dans la boucle SSE.
// Chaque tenant a sa propre liste : tenant:{tenantId}:events

export async function GET(request: NextRequest) {
  let auth;
  try {
    auth = requireAuth(request);
  } catch {
    return Response.json({ message: 'Non authentifié' }, { status: 401 });
  }

  const tenantId = requireTenant(auth);
  const listKey = tenantId ? `tenant:${tenantId}:events` : `super_admin:events`;

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      while (!closed) {
        try {
          const message = await redis.rpop<string>(listKey);
          if (message) {
            controller.enqueue(encoder.encode(`data: ${typeof message === 'string' ? message : JSON.stringify(message)}\n\n`));
          } else {
            // Pas de message — attendre 2 secondes avant de re-poll
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
