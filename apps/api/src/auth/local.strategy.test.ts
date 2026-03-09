import { beforeEach, describe, expect, it, vi } from "vitest";

class UnauthorizedException extends Error {}

vi.mock("@nestjs/common", () => ({
  Injectable: () => (target: any) => target,
  UnauthorizedException,
}), { virtual: true });
vi.mock("../auth.service", () => ({ AuthService: class AuthService {} }), { virtual: true });
vi.mock("@nestjs/passport", () => ({
  PassportStrategy: (Base: any) => class extends Base {},
}), { virtual: true });
vi.mock("passport-local", () => ({
  Strategy: class Strategy {
    constructor(_opts: any) {}
  },
}));

describe("LocalStrategy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user when auth service validates credentials", async () => {
    const { LocalStrategy } = await import("./local.strategy.js");
    const auth = { validateUser: vi.fn().mockResolvedValue({ id: 1, email: "a@b.com" }) } as any;
    const strategy = new LocalStrategy(auth);

    await expect(strategy.validate("a@b.com", "pw")).resolves.toEqual({ id: 1, email: "a@b.com" });
  });

  it("throws UnauthorizedException when credentials are invalid", async () => {
    const { LocalStrategy } = await import("./local.strategy.js");
    const auth = { validateUser: vi.fn().mockResolvedValue(null) } as any;
    const strategy = new LocalStrategy(auth);

    await expect(strategy.validate("a@b.com", "pw")).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
