import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

type EnvSnapshot = {
  NODE_ENV?: string;
  RATE_LIMIT_REDIS_URL?: string;
  RATE_LIMIT_ALLOW_IN_MEMORY?: string;
};

const ORIGINAL_ENV: EnvSnapshot = {
  NODE_ENV: process.env.NODE_ENV,
  RATE_LIMIT_REDIS_URL: process.env.RATE_LIMIT_REDIS_URL,
  RATE_LIMIT_ALLOW_IN_MEMORY: process.env.RATE_LIMIT_ALLOW_IN_MEMORY,
};

function restoreEnv() {
  if (ORIGINAL_ENV.NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = ORIGINAL_ENV.NODE_ENV;

  if (ORIGINAL_ENV.RATE_LIMIT_REDIS_URL === undefined) delete process.env.RATE_LIMIT_REDIS_URL;
  else process.env.RATE_LIMIT_REDIS_URL = ORIGINAL_ENV.RATE_LIMIT_REDIS_URL;

  if (ORIGINAL_ENV.RATE_LIMIT_ALLOW_IN_MEMORY === undefined) delete process.env.RATE_LIMIT_ALLOW_IN_MEMORY;
  else process.env.RATE_LIMIT_ALLOW_IN_MEMORY = ORIGINAL_ENV.RATE_LIMIT_ALLOW_IN_MEMORY;
}

describe("rateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    restoreEnv();
  });

  afterAll(() => {
    restoreEnv();
  });

  it("returns 503 when the backing store fails", async () => {
    process.env.NODE_ENV = "test";
    const { rateLimit } = await import("./rateLimit.js");
    const middleware = rateLimit({
      windowMs: 60_000,
      max: 1,
      prefix: "test",
      store: {
        incrementAndGet: vi.fn(async () => {
          throw new Error("redis unavailable");
        }),
      },
    });

    const status = vi.fn().mockReturnThis();
    const json = vi.fn().mockReturnThis();
    const setHeader = vi.fn();
    const next = vi.fn();

    await middleware({ ip: "127.0.0.1" } as any, { status, json, setHeader } as any, next);

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({ error: "Rate limit service unavailable." });
    expect(next).not.toHaveBeenCalled();
  });

  it("requires RATE_LIMIT_REDIS_URL in production by default", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.RATE_LIMIT_REDIS_URL;
    delete process.env.RATE_LIMIT_ALLOW_IN_MEMORY;

    const { rateLimit } = await import("./rateLimit.js");
    expect(() =>
      rateLimit({
        windowMs: 60_000,
        max: 1,
        prefix: "test",
      }),
    ).toThrow("RATE_LIMIT_REDIS_URL is required in production");
  });

  it("allows in-memory fallback in production when explicitly enabled", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.RATE_LIMIT_REDIS_URL;
    process.env.RATE_LIMIT_ALLOW_IN_MEMORY = "true";

    const { rateLimit } = await import("./rateLimit.js");
    expect(() =>
      rateLimit({
        windowMs: 60_000,
        max: 1,
        prefix: "test",
      }),
    ).not.toThrow();
  });
});
