import type { Env } from "../types";

interface RateLimitData {
  count: number;
  windowStart: number;
}

export async function checkRateLimit(
  env: Env,
  key: string,
  limit: number,
  windowSec: number
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const kvKey = `rate_limit:${key}`;
  const now = Math.floor(Date.now() / 1000);

  const raw = await env.RATE_LIMIT_KV.get(kvKey, "json") as RateLimitData | null;

  if (!raw || now - raw.windowStart > windowSec) {
    await env.RATE_LIMIT_KV.put(
      kvKey,
      JSON.stringify({ count: 1, windowStart: now }),
      { expirationTtl: windowSec }
    );
    return { allowed: true };
  }

  if (raw.count >= limit) {
    const retryAfter = windowSec - (now - raw.windowStart);
    return { allowed: false, retryAfter };
  }

  await env.RATE_LIMIT_KV.put(
    kvKey,
    JSON.stringify({ count: raw.count + 1, windowStart: raw.windowStart }),
    { expirationTtl: windowSec }
  );
  return { allowed: true };
}
