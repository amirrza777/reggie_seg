import { describe, it, expect, vi } from "vitest";

const moduleSpy = vi.fn();

vi.mock("@nestjs/common", () => ({
  Module: (meta: any) => {
    moduleSpy(meta);
    return (target: any) => target;
  },
}), { virtual: true });

vi.mock("@nestjs/jwt", () => ({ JwtModule: { register: vi.fn(() => "JwtModule") } }), { virtual: true });
vi.mock("@nestjs/passport", () => ({ PassportModule: "PassportModule" }), { virtual: true });
vi.mock("@nestjs/config", () => ({ ConfigModule: "ConfigModule" }), { virtual: true });

vi.mock("./auth.service", () => ({ AuthService: class AuthService {} }), { virtual: true });
vi.mock("./auth.controller", () => ({ AuthController: class AuthController {} }), { virtual: true });
vi.mock("./strategies/local.strategy", () => ({ LocalStrategy: class LocalStrategy {} }), { virtual: true });
vi.mock("./strategies/jwt-access.strategy", () => ({ JwtAccessStrategy: class JwtAccessStrategy {} }), { virtual: true });
vi.mock("./strategies/jwt-refresh.strategy", () => ({ JwtRefreshStrategy: class JwtRefreshStrategy {} }), { virtual: true });
vi.mock("./guards/jwt-refresh.guard", () => ({ JwtRefreshGuard: class JwtRefreshGuard {} }), { virtual: true });
vi.mock("./guards/jwt-access.guard", () => ({ JwtAccessGuard: class JwtAccessGuard {} }), { virtual: true });
vi.mock("./guards/local-auth.guard", () => ({ LocalAuthGuard: class LocalAuthGuard {} }), { virtual: true });
vi.mock("../users/users.service", () => ({ UsersService: class UsersService {} }), { virtual: true });
vi.mock("../prisma/prisma.service", () => ({ PrismaService: class PrismaService {} }), { virtual: true });

describe("AuthModule (nestjs)", () => {
  it("declares module metadata", async () => {
    const { AuthModule } = await import("./auth.module.js");

    expect(AuthModule).toBeDefined();
    expect(moduleSpy).toHaveBeenCalledTimes(1);
    const meta = moduleSpy.mock.calls[0][0];
    expect(meta.controllers).toHaveLength(1);
    expect(meta.providers.length).toBeGreaterThan(5);
    expect(meta.exports).toHaveLength(1);
  });
});
