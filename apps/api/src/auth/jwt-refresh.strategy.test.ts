import { beforeEach, describe, expect, it, vi } from "vitest";

const superOptions = vi.fn();
class UnauthorizedException extends Error {}

vi.mock("@nestjs/common", () => ({
  Injectable: () => (target: any) => target,
  UnauthorizedException,
}), { virtual: true });
vi.mock("@nestjs/config", () => ({ ConfigService: class ConfigService {} }), { virtual: true });
vi.mock("../auth.service", () => ({ AuthService: class AuthService {} }), { virtual: true });
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
  ExtractJwt: { fromExtractors: vi.fn((list: any[]) => list[0]) },
  Strategy: class Strategy {
    constructor(_opts: any) {}
  },
}));

describe("JwtRefreshStrategy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches refresh token and returns payload when token is valid", async () => {
    const { JwtRefreshStrategy } = await import("./jwt-refresh.strategy.js");
    const auth = { validateRefreshToken: vi.fn().mockResolvedValue(true) } as any;
    const strategy = new JwtRefreshStrategy({ get: vi.fn().mockReturnValue("refresh-secret") } as any, auth);
    const req: any = { cookies: { refresh_token: "rt" } };

    await expect(strategy.validate(req, { sub: 4 })).resolves.toEqual({ sub: 4 });
    expect(auth.validateRefreshToken).toHaveBeenCalledWith(4, "rt");
    expect(req.refreshToken).toBe("rt");
    expect(superOptions).toHaveBeenCalledWith(expect.objectContaining({ passReqToCallback: true }));
  });

  it("throws UnauthorizedException when token is invalid", async () => {
    const { JwtRefreshStrategy } = await import("./jwt-refresh.strategy.js");
    const auth = { validateRefreshToken: vi.fn().mockResolvedValue(false) } as any;
    const strategy = new JwtRefreshStrategy({ get: vi.fn().mockReturnValue("refresh-secret") } as any, auth);

    await expect(strategy.validate({ body: { refreshToken: "bad" } } as any, { sub: 4 })).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });
});
