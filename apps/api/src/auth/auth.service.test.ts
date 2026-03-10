import { beforeEach, describe, expect, it, vi } from "vitest";

const hashMock = vi.fn(async (v: string) => `hashed:${v}`);
const verifyMock = vi.fn(async (hashed: string, plain: string) => hashed === `hashed:${plain}`);

vi.mock("argon2", () => ({
  default: { hash: hashMock, verify: verifyMock },
  hash: hashMock,
  verify: verifyMock,
}));

class UnauthorizedException extends Error {}
vi.mock("@nestjs/common", () => ({ Injectable: () => (target: any) => target, UnauthorizedException }), {
  virtual: true,
});
vi.mock("@nestjs/jwt", () => ({ JwtService: class JwtService {} }), { virtual: true });
vi.mock("@nestjs/config", () => ({ ConfigService: class ConfigService {} }), { virtual: true });
vi.mock("../prisma/prisma.service", () => ({ PrismaService: class PrismaService {} }), { virtual: true });
vi.mock("../users/users.service", () => ({ UsersService: class UsersService {} }), { virtual: true });

describe("AuthService (nestjs)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signUp creates user, issues and stores refresh", async () => {
    const { AuthService } = await import("./auth.service.js");
    const users = {
      create: vi.fn().mockResolvedValue({ id: 2, email: "u@test.com" }),
    } as any;
    const prisma = {
      refreshToken: { create: vi.fn().mockResolvedValue(undefined), findMany: vi.fn(), updateMany: vi.fn() },
    } as any;
    const jwt = {
      signAsync: vi.fn().mockResolvedValueOnce("acc").mockResolvedValueOnce("ref"),
    } as any;
    const config = {
      get: vi
        .fn()
        .mockImplementation((k: string) =>
          ({ JWT_ACCESS_SECRET: "a", JWT_ACCESS_TTL: "900s", JWT_REFRESH_SECRET: "r", JWT_REFRESH_TTL: "30d" })[k]
        ),
    } as any;

    const service = new AuthService(users, prisma, jwt, config);
    const tokens = await service.signUp("u@test.com", "pw", "Name");

    expect(users.create).toHaveBeenCalledWith({ email: "u@test.com", password: "hashed:pw", name: "Name" });
    expect(prisma.refreshToken.create).toHaveBeenCalled();
    expect(tokens).toEqual({ accessToken: "acc", refreshToken: "ref" });
  });

  it("validateUser returns null when user missing or password mismatch", async () => {
    const { AuthService } = await import("./auth.service.js");
    const users = {
      findByEmail: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, email: "a", password: "hashed:ok" }),
      findById: vi.fn(),
    } as any;
    const service = new AuthService(users, { refreshToken: {} } as any, {} as any, { get: vi.fn() } as any);

    await expect(service.validateUser("a", "x")).resolves.toBeNull();
    await expect(service.validateUser("a", "bad")).resolves.toBeNull();
  });

  it("rotateRefresh throws UnauthorizedException when token is invalid", async () => {
    const { AuthService } = await import("./auth.service.js");
    const prisma = {
      refreshToken: {
        findMany: vi.fn().mockResolvedValue([{ hashedToken: "hashed:something" }]),
        updateMany: vi.fn(),
        create: vi.fn(),
      },
    } as any;
    const service = new AuthService(
      { findById: vi.fn(), create: vi.fn(), findByEmail: vi.fn() } as any,
      prisma,
      { signAsync: vi.fn() } as any,
      { get: vi.fn().mockReturnValue("30d") } as any
    );

    await expect(service.rotateRefresh(1, "wrong")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("logout revokes active refresh tokens", async () => {
    const { AuthService } = await import("./auth.service.js");
    const prisma = {
      refreshToken: { updateMany: vi.fn().mockResolvedValue(undefined) },
    } as any;
    const service = new AuthService({} as any, prisma, {} as any, {} as any);

    await service.logout(9);

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 9, revoked: false },
      data: { revoked: true },
    });
  });
});
