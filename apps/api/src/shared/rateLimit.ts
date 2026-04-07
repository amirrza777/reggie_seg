import type { Request, Response, NextFunction } from "express";

type Window = { count: number; resetAt: number };

type RateLimitHit = { count: number; resetAt: number };

export type RateLimitStore = {
  incrementAndGet(key: string, windowMs: number): Promise<RateLimitHit>;
};

class InMemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<string, Window>();

  constructor() {
    const pruneInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, win] of this.store) {
        if (now > win.resetAt) this.store.delete(key);
      }
    }, 60_000);
    pruneInterval.unref();
  }

  async incrementAndGet(key: string, windowMs: number): Promise<RateLimitHit> {
    const now = Date.now();
    const current = this.store.get(key);

    if (!current || now > current.resetAt) {
      const next = { count: 1, resetAt: now + windowMs };
      this.store.set(key, next);
      return next;
    }

    current.count += 1;
    return current;
  }
}

const inMemoryStore = new InMemoryRateLimitStore();
let warnedOnRedisFallback = false;

function warnRedisFallback(reason: string) {
  if (warnedOnRedisFallback) return;
  warnedOnRedisFallback = true;
  if (process.env.NODE_ENV === "test") return;
  console.warn(`[rateLimit] Falling back to in-memory store: ${reason}`);
}

class RedisRateLimitStore implements RateLimitStore {
  private readonly clientPromise: Promise<any>;

  constructor(redisUrl: string) {
    this.clientPromise = this.connect(redisUrl);
  }

  private async connect(redisUrl: string) {
    const redis = (await import("redis")) as { createClient: (opts: { url: string }) => any };
    const client = redis.createClient({ url: redisUrl });
    await client.connect();
    return client;
  }

  async incrementAndGet(key: string, windowMs: number): Promise<RateLimitHit> {
    try {
      const client = await this.clientPromise;
      const count = Number(await client.incr(key));
      if (count === 1) {
        await client.pExpire(key, windowMs);
      }
      const ttl = Number(await client.pTTL(key));
      const resetInMs = ttl > 0 ? ttl : windowMs;
      return { count, resetAt: Date.now() + resetInMs };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      warnRedisFallback(message);
      return inMemoryStore.incrementAndGet(key, windowMs);
    }
  }
}

let envSelectedStore: RateLimitStore | null = null;

function resolveStoreFromEnv(): RateLimitStore {
  if (envSelectedStore) return envSelectedStore;

  const redisUrl = process.env.RATE_LIMIT_REDIS_URL?.trim();
  if (!redisUrl) {
    envSelectedStore = inMemoryStore;
    return envSelectedStore;
  }

  try {
    envSelectedStore = new RedisRateLimitStore(redisUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    warnRedisFallback(message);
    envSelectedStore = inMemoryStore;
  }

  return envSelectedStore;
}

function defaultClientKey(req: Request, prefix: string): string {
  return `${prefix}:ip:${req.ip ?? "unknown"}`;
}

function resolveStore(store?: RateLimitStore) {
  return store ?? resolveStoreFromEnv();
}

export function rateLimit(options: {
  windowMs: number;
  max: number;
  prefix: string;
  key?: (req: Request, prefix: string) => string;
  store?: RateLimitStore;
}) {
  const { windowMs, max, prefix, key = defaultClientKey } = options;
  const store = resolveStore(options.store);

  return async (req: Request, res: Response, next: NextFunction) => {
    const bucketKey = key(req, prefix);
    const hit = await store.incrementAndGet(bucketKey, windowMs);
    const now = Date.now();

    if (hit.count > max) {
      res.setHeader("Retry-After", Math.ceil((hit.resetAt - now) / 1000));
      return res.status(429).json({ error: "Too many requests, please try again later." });
    }

    return next();
  };
}
