import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "./env";

export type LimiterBucket =
  | "create"
  | "send"
  | "bottle"
  | "recover_ip"
  | "recover_user"
  | "unlock"
  | "publish"
  | "react"
  | "report"
  | "read"
  | "music_search";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const hasUpstash =
  Boolean(env.UPSTASH_REDIS_REST_URL) && Boolean(env.UPSTASH_REDIS_REST_TOKEN);

const redisClient = hasUpstash
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const ephemeralCache = new Map();

// Instantiate limiters when real Upstash Redis is configured
const limiters: Record<LimiterBucket, Ratelimit | null> = {
  create: redisClient
    ? new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(3, "1 h"),
        prefix: "rl:create",
        ephemeralCache,
        analytics: false,
      })
    : null,

  send: redisClient
    ? new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(8, "10 m"),
        prefix: "rl:send",
        ephemeralCache,
        analytics: false,
      })
    : null,

  bottle: redisClient
    ? new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(3, "1 h"),
        prefix: "rl:bottle",
        ephemeralCache,
        analytics: false,
      })
    : null,

  recover_ip: redisClient
    ? new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(5, "10 m"),
        prefix: "rl:recover:ip",
        ephemeralCache,
        analytics: false,
      })
    : null,

  recover_user: redisClient
    ? new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        prefix: "rl:recover:user",
        ephemeralCache,
        analytics: false,
      })
    : null,

  unlock: redisClient
    ? new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(10, "10 m"),
        prefix: "rl:unlock",
        ephemeralCache,
        analytics: false,
      })
    : null,

  publish: redisClient
    ? new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        prefix: "rl:publish",
        ephemeralCache,
        analytics: false,
      })
    : null,

  react: redisClient
    ? new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        prefix: "rl:react",
        ephemeralCache,
        analytics: false,
      })
    : null,

  report: redisClient
    ? new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        prefix: "rl:report",
        ephemeralCache,
        analytics: false,
      })
    : null,

  read: redisClient
    ? new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(60, "1 m"),
        prefix: "rl:read",
        ephemeralCache,
        analytics: false,
      })
    : null,

  music_search: redisClient
    ? new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(15, "1 m"),
        prefix: "rl:music:search",
        ephemeralCache,
        analytics: false,
      })
    : null,
};

let hasWarnedDevShim = false;

/**
 * Checks a named rate limit bucket. Fails open on infrastructure errors.
 */
export async function checkRateLimit(
  bucket: LimiterBucket,
  identifier: string
): Promise<RateLimitResult> {
  const limiter = limiters[bucket];

  if (!limiter) {
    if (!hasWarnedDevShim) {
      console.warn(
        `[chithi] Dev fallback mode: rate limiting is active in bypass mode (all requests allowed).`
      );
      hasWarnedDevShim = true;
    }
    return {
      success: true,
      limit: 1000,
      remaining: 999,
      reset: Date.now() + 60_000,
    };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error(`[chithi] Rate limiter error on bucket "${bucket}":`, error);
    // Fail open per §10.1
    return {
      success: true,
      limit: 1000,
      remaining: 1000,
      reset: Date.now() + 60_000,
    };
  }
}
