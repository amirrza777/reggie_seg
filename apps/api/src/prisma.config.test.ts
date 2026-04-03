import { describe, expect, it, vi, afterEach } from "vitest";

describe("prisma.config.ts", () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it("uses DATABASE_URL when provided", async () => {
    process.env = { ...ORIGINAL_ENV, DATABASE_URL: "mysql://test-user:test-pass@db:3306/test_db" };
    const mod = await import("../prisma.config.ts");
    const cfg = mod.default;

    expect(cfg).toMatchObject({
      schema: "prisma/schema",
      engine: "classic",
      migrations: { path: "prisma/migrations" },
      datasource: { url: "mysql://test-user:test-pass@db:3306/test_db" },
    });
  });

  it("falls back to local mysql URL when DATABASE_URL is missing", async () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.DATABASE_URL;

    const mod = await import("../prisma.config.ts");
    const cfg = mod.default;

    expect(cfg.datasource?.url).toBe("mysql://root:root@localhost:3306/reggie_dev");
    expect(cfg.schema).toBe("prisma/schema");
    expect(cfg.migrations?.path).toBe("prisma/migrations");
    expect(cfg.engine).toBe("classic");
  });
});
