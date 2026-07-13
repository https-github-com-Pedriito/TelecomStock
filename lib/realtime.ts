import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function publishChange(
  tenantId: string,
  table: string,
  type: 'create' | 'update' | 'delete',
  data?: unknown
) {
  try {
    await redis.publish(
      `tenant:${tenantId}`,
      JSON.stringify({ table, type, data, timestamp: new Date() })
    );
  } catch {
    // Redis failure must not break the request
  }
}
