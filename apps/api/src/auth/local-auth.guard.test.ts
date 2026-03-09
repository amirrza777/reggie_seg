import { describe, expect, it, vi } from "vitest";

vi.mock("@nestjs/common", () => ({ Injectable: () => (target: any) => target }), { virtual: true });
vi.mock("@nestjs/passport", () => ({
  AuthGuard: (strategy: string) =>
    class {
      static strategy = strategy;
    },
}), { virtual: true });

describe("LocalAuthGuard", () => {
  it("extends AuthGuard with local strategy", async () => {
    const { LocalAuthGuard } = await import("./local-auth.guard.js");
    expect((LocalAuthGuard as any).strategy).toBe("local");
  });
});
