import { describe, expect, it, vi } from "vitest";

const superOptions = vi.fn();

vi.mock("@nestjs/common", () => ({ Injectable: () => (target: any) => target }), { virtual: true });
vi.mock("@nestjs/config", () => ({ ConfigService: class ConfigService {} }), { virtual: true });
vi.mock("@nestjs/passport", () => ({
  PassportStrategy: (Base: any) =>
    class extends Base {
      constructor(...args: any[]) {
        super(...args);
        superOptions(...args);
      }
    },
}), { virtual: true });
vi.mock("passport-jwt", () => ({
  ExtractJwt: { fromAuthHeaderAsBearerToken: vi.fn(() => "extractor") },
  Strategy: class Strategy {
    constructor(_opts: any) {}
  },
}));

describe("JwtAccessStrategy", () => {
  it("configures passport strategy and returns payload from validate", async () => {
    const { JwtAccessStrategy } = await import("./jwt-access.strategy.js");
    const config = { get: vi.fn().mockReturnValue("access-secret") } as any;
    const strategy = new JwtAccessStrategy(config);

    expect(superOptions).toHaveBeenCalledWith(
      expect.objectContaining({ secretOrKey: "access-secret", jwtFromRequest: "extractor" })
    );
    expect(strategy.validate({ sub: 1, email: "a@b.com" })).toEqual({ sub: 1, email: "a@b.com" });
  });
});
