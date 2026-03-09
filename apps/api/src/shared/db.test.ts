import { describe, expect, it, vi } from "vitest";

const prismaCtor = vi.hoisted(() => vi.fn());

vi.mock("@prisma/client", () => ({
  PrismaClient: class PrismaClient {
    constructor() {
      prismaCtor();
    }
  },
}));

describe("shared db", () => {
  it("creates and exports a Prisma client singleton", async () => {
    const mod = await import("./db.js");

    expect(prismaCtor).toHaveBeenCalledTimes(1);
    expect(mod.prisma).toBeDefined();
    expect(typeof mod.prisma).toBe("object");
  });
});
