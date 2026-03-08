import { describe, expect, it, vi } from "vitest";

vi.mock("@nestjs/common", () => ({ Injectable: () => (target: any) => target }), { virtual: true });
vi.mock("@nestjs/passport", () => ({
  AuthGuard: (strategy: string) =>
    class {
      static strategy = strategy;
    },
}), { virtual: true });

describe("JwtRefreshGuard", () => {
  it("extends AuthGuard with jwt-refresh strategy", async () => {
    const { JwtRefreshGuard } = await import("./jwt-refresh.guard.js");
    expect((JwtRefreshGuard as any).strategy).toBe("jwt-refresh");
  });
});
