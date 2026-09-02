import { Redis } from "@upstash/redis";
import { env } from "./env";

export interface PipelineLike {
  get(key: string): PipelineLike;
  set(
    key: string,
    value: unknown,
    options?: { ex?: number; px?: number; nx?: boolean; xx?: boolean; keepTtl?: boolean }
  ): PipelineLike;
  del(...keys: string[]): PipelineLike;
  incr(key: string): PipelineLike;
  decr(key: string): PipelineLike;
  expire(key: string, seconds: number): PipelineLike;
  ttl(key: string): PipelineLike;
  mget(...keys: string[]): PipelineLike;
  hincrby(key: string, field: string, increment: number): PipelineLike;
  hgetall(key: string): PipelineLike;
  zadd(
    key: string,
    scoreMember: { score: number; member: string } | { score: number; member: string }[]
  ): PipelineLike;
  zrem(key: string, ...members: string[]): PipelineLike;
  zrange(key: string, min: number, max: number, options?: { rev?: boolean }): PipelineLike;
  zrevrange(key: string, min: number, max: number): PipelineLike;
  zremrangebyscore(key: string, min: number | string, max: number | string): PipelineLike;
  zcard(key: string): PipelineLike;
  exec<T extends unknown[] = unknown[]>(): Promise<T>;
}

export interface RedisLike {
  get<T = unknown>(key: string): Promise<T | null>;
  set(
    key: string,
    value: unknown,
    options?: { ex?: number; px?: number; nx?: boolean; xx?: boolean; keepTtl?: boolean }
  ): Promise<string | null | "OK">;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  mget<T extends unknown[]>(...keys: string[]): Promise<T>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  hgetall<T extends Record<string, unknown> = Record<string, unknown>>(
    key: string
  ): Promise<T | null>;
  zadd(
    key: string,
    scoreMember: { score: number; member: string } | { score: number; member: string }[]
  ): Promise<number>;
  zrem(key: string, ...members: string[]): Promise<number>;
  zrange(key: string, min: number, max: number, options?: { rev?: boolean }): Promise<string[]>;
  zrevrange(key: string, min: number, max: number): Promise<string[]>;
  zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number>;
  zcard(key: string): Promise<number>;
  pipeline(): PipelineLike;
  keys(pattern: string): Promise<string[]>;
}

// In-process memory store for development fallback
interface StoredItem {
  value: unknown;
  expiresAt: number | null; // epoch ms
}

class InMemoryRedisShim implements RedisLike {
  private store = new Map<string, StoredItem>();
  private hashes = new Map<string, { data: Map<string, number | string>; expiresAt: number | null }>();
  private zsets = new Map<string, { data: Map<string, number>; expiresAt: number | null }>();

  private isExpired(expiresAt: number | null): boolean {
    return expiresAt !== null && Date.now() > expiresAt;
  }

  private cleanKey(key: string) {
    const item = this.store.get(key);
    if (item && this.isExpired(item.expiresAt)) {
      this.store.delete(key);
    }
    const h = this.hashes.get(key);
    if (h && this.isExpired(h.expiresAt)) {
      this.hashes.delete(key);
    }
    const z = this.zsets.get(key);
    if (z && this.isExpired(z.expiresAt)) {
      this.zsets.delete(key);
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    this.cleanKey(key);
    const item = this.store.get(key);
    if (!item) return null;
    return item.value as T;
  }

  async set(
    key: string,
    value: unknown,
    options?: { ex?: number; px?: number; nx?: boolean; xx?: boolean; keepTtl?: boolean }
  ): Promise<string | null | "OK"> {
    this.cleanKey(key);
    const exists = this.store.has(key);

    if (options?.nx && exists) {
      return null;
    }
    if (options?.xx && !exists) {
      return null;
    }

    let expiresAt: number | null = null;
    if (options?.keepTtl && exists) {
      expiresAt = this.store.get(key)?.expiresAt ?? null;
    } else if (options?.ex) {
      expiresAt = Date.now() + options.ex * 1000;
    } else if (options?.px) {
      expiresAt = Date.now() + options.px;
    }

    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      this.cleanKey(key);
      if (this.store.delete(key)) count++;
      if (this.hashes.delete(key)) count++;
      if (this.zsets.delete(key)) count++;
    }
    return count;
  }

  async incr(key: string): Promise<number> {
    this.cleanKey(key);
    const item = this.store.get(key);
    let val = 0;
    if (item && typeof item.value === "number") {
      val = item.value;
    } else if (item && typeof item.value === "string") {
      val = parseInt(item.value, 10) || 0;
    }
    val += 1;
    this.store.set(key, { value: val, expiresAt: item?.expiresAt ?? null });
    return val;
  }

  async decr(key: string): Promise<number> {
    this.cleanKey(key);
    const item = this.store.get(key);
    let val = 0;
    if (item && typeof item.value === "number") {
      val = item.value;
    } else if (item && typeof item.value === "string") {
      val = parseInt(item.value, 10) || 0;
    }
    val -= 1;
    if (val < 0) val = 0; // Clamped at 0 for unread counters
    this.store.set(key, { value: val, expiresAt: item?.expiresAt ?? null });
    return val;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const expiresAt = Date.now() + seconds * 1000;
    let found = false;
    const item = this.store.get(key);
    if (item) {
      item.expiresAt = expiresAt;
      found = true;
    }
    const h = this.hashes.get(key);
    if (h) {
      h.expiresAt = expiresAt;
      found = true;
    }
    const z = this.zsets.get(key);
    if (z) {
      z.expiresAt = expiresAt;
      found = true;
    }
    return found ? 1 : 0;
  }

  async ttl(key: string): Promise<number> {
    this.cleanKey(key);
    const item = this.store.get(key) || this.hashes.get(key) || this.zsets.get(key);
    if (!item) return -2;
    if (item.expiresAt === null) return -1;
    const rem = Math.floor((item.expiresAt - Date.now()) / 1000);
    return rem > 0 ? rem : -2;
  }

  async mget<T extends unknown[]>(...keys: string[]): Promise<T> {
    const result = keys.map((key) => {
      this.cleanKey(key);
      const item = this.store.get(key);
      return item ? item.value : null;
    });
    return result as T;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    this.cleanKey(key);
    let h = this.hashes.get(key);
    if (!h) {
      h = { data: new Map(), expiresAt: null };
      this.hashes.set(key, h);
    }
    const cur = Number(h.data.get(field) || 0);
    const updated = cur + increment;
    h.data.set(field, updated);
    return updated;
  }

  async hgetall<T extends Record<string, unknown> = Record<string, unknown>>(
    key: string
  ): Promise<T | null> {
    this.cleanKey(key);
    const h = this.hashes.get(key);
    if (!h) return null;
    const obj: Record<string, unknown> = {};
    for (const [k, v] of h.data.entries()) {
      obj[k] = v;
    }
    return obj as T;
  }

  async zadd(
    key: string,
    scoreMember: { score: number; member: string } | { score: number; member: string }[]
  ): Promise<number> {
    this.cleanKey(key);
    let z = this.zsets.get(key);
    if (!z) {
      z = { data: new Map(), expiresAt: null };
      this.zsets.set(key, z);
    }
    const items = Array.isArray(scoreMember) ? scoreMember : [scoreMember];
    let added = 0;
    for (const item of items) {
      if (!z.data.has(item.member)) added++;
      z.data.set(item.member, item.score);
    }
    return added;
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    this.cleanKey(key);
    const z = this.zsets.get(key);
    if (!z) return 0;
    let count = 0;
    for (const m of members) {
      if (z.data.delete(m)) count++;
    }
    return count;
  }

  async zrange(
    key: string,
    min: number,
    max: number,
    options?: { rev?: boolean }
  ): Promise<string[]> {
    this.cleanKey(key);
    const z = this.zsets.get(key);
    if (!z) return [];
    const entries = Array.from(z.data.entries());
    entries.sort((a, b) => (options?.rev ? b[1] - a[1] : a[1] - b[1]));
    const members = entries.map((e) => e[0]);
    const start = min < 0 ? Math.max(members.length + min, 0) : min;
    const end = max < 0 ? members.length + max + 1 : max + 1;
    return members.slice(start, end);
  }

  async zrevrange(key: string, min: number, max: number): Promise<string[]> {
    return this.zrange(key, min, max, { rev: true });
  }

  async zremrangebyscore(
    key: string,
    min: number | string,
    max: number | string
  ): Promise<number> {
    this.cleanKey(key);
    const z = this.zsets.get(key);
    if (!z) return 0;
    const minVal = min === "-inf" ? -Infinity : Number(min);
    const maxVal = max === "+inf" ? Infinity : Number(max);
    let count = 0;
    for (const [member, score] of Array.from(z.data.entries())) {
      if (score >= minVal && score <= maxVal) {
        z.data.delete(member);
        count++;
      }
    }
    return count;
  }

  async zcard(key: string): Promise<number> {
    this.cleanKey(key);
    const z = this.zsets.get(key);
    return z ? z.data.size : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const escaped = pattern.replace(/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&").replace(/\*/g, ".*");
    const regex = new RegExp(`^${escaped}$`);
    const matches: string[] = [];

    for (const key of Array.from(this.store.keys())) {
      this.cleanKey(key);
      if (this.store.has(key) && regex.test(key)) {
        matches.push(key);
      }
    }
    return matches;
  }

  pipeline(): PipelineLike {
    const queue: Array<() => Promise<unknown>> = [];

    const p: PipelineLike = {
      get: (key) => {
        queue.push(() => this.get(key));
        return p;
      },
      set: (key, val, opt) => {
        queue.push(() => this.set(key, val, opt));
        return p;
      },
      del: (...keys) => {
        queue.push(() => this.del(...keys));
        return p;
      },
      incr: (key) => {
        queue.push(() => this.incr(key));
        return p;
      },
      decr: (key) => {
        queue.push(() => this.decr(key));
        return p;
      },
      expire: (key, seconds) => {
        queue.push(() => this.expire(key, seconds));
        return p;
      },
      ttl: (key) => {
        queue.push(() => this.ttl(key));
        return p;
      },
      mget: (...keys) => {
        queue.push(() => this.mget(...keys));
        return p;
      },
      hincrby: (key, field, incr) => {
        queue.push(() => this.hincrby(key, field, incr));
        return p;
      },
      hgetall: (key) => {
        queue.push(() => this.hgetall(key));
        return p;
      },
      zadd: (key, scoreMember) => {
        queue.push(() => this.zadd(key, scoreMember));
        return p;
      },
      zrem: (key, ...members) => {
        queue.push(() => this.zrem(key, ...members));
        return p;
      },
      zrange: (key, min, max, opt) => {
        queue.push(() => this.zrange(key, min, max, opt));
        return p;
      },
      zrevrange: (key, min, max) => {
        queue.push(() => this.zrevrange(key, min, max));
        return p;
      },
      zremrangebyscore: (key, min, max) => {
        queue.push(() => this.zremrangebyscore(key, min, max));
        return p;
      },
      zcard: (key) => {
        queue.push(() => this.zcard(key));
        return p;
      },
      exec: async <T extends unknown[] = unknown[]>(): Promise<T> => {
        const results: unknown[] = [];
        for (const op of queue) {
          results.push(await op());
        }
        return results as T;
      },
    };

    return p;
  }
}

// Global singleton instance so dev memory persists across Fast Refresh in Node
const globalForRedis = globalThis as unknown as {
  _chithiRedisInstance?: RedisLike;
  _hasLoggedDevWarning?: boolean;
};

export function getRedis(): RedisLike {
  if (globalForRedis._chithiRedisInstance) {
    return globalForRedis._chithiRedisInstance;
  }

  const hasUpstash =
    Boolean(env.UPSTASH_REDIS_REST_URL) && Boolean(env.UPSTASH_REDIS_REST_TOKEN);

  if (hasUpstash) {
    const client = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    globalForRedis._chithiRedisInstance = client as unknown as RedisLike;
    return globalForRedis._chithiRedisInstance;
  }

  if (!globalForRedis._hasLoggedDevWarning) {
    console.info(
      "[chithi] No Upstash credentials — using in-memory store. Data resets on reload. Dev only."
    );
    globalForRedis._hasLoggedDevWarning = true;
  }

  const shim = new InMemoryRedisShim();
  globalForRedis._chithiRedisInstance = shim;
  return shim;
}
