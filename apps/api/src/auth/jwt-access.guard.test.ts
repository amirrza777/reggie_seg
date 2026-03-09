import { describe, expect, it, vi } from "vitest";

vi.mock("@nestjs/common", () => ({ Injectable: () => (target: any) => target }), { virtual: true });
vi.mock("@nestjs/passport", () => ({
  AuthGuard: (strategy: string) =>
    class {
      static strategy = strategy;
    },
}), { virtual: true });

describe("JwtAccessGuard", () => {
  it("extends AuthGuard with jwt-access strategy", async () => {
    const { JwtAccessGuard } = await import("./jwt-access.guard.js");
    expect((JwtAccessGuard as any).strategy).toBe("jwt-access");
  });
});
