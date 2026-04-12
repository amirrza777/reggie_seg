/* eslint-disable max-lines-per-function, @typescript-eslint/no-explicit-any */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  applyEnv,
  argon2Mock,
  loadService,
  prismaMock,
  setupAuthServiceTestDefaults,
} from "../service.test-helpers.js";

beforeEach(() => {
  setupAuthServiceTestDefaults();
});

afterAll(() => {
  applyEnv();
});

describe("auth service", () => {
  it("signUp always creates a student account even when a privileged role is requested", async () => {
    const svc = await loadService();

    argon2Mock.hash.mockResolvedValueOnce("password-hash").mockResolvedValueOnce("refresh-hash");
    prismaMock.enterprise.findUnique.mockResolvedValueOnce({ id: "ent-99" });
    prismaMock.user.create.mockResolvedValueOnce({ id: 4, email: "user@example.com", role: "STUDENT" });

    const tokens = await svc.signUp({
      enterpriseCode: " ent-99 ",
      email: "User@Example.com",
      password: "pw",
      role: "ADMIN" as any,
    } as any);

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: "user@example.com",
        passwordHash: "password-hash",
        firstName: "",
        lastName: "",
        role: "STUDENT",
        enterpriseId: "ent-99",
      },
    });
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 4, hashedToken: "refresh-hash" }),
    });
    expect(tokens).toEqual({ accessToken: "signed-1", refreshToken: "signed-2" });
  });

  it("signUp keeps allowed non-admin role", async () => {
    const svc = await loadService();

    argon2Mock.hash.mockResolvedValueOnce("password-hash").mockResolvedValueOnce("refresh-hash");
    prismaMock.enterprise.findUnique.mockResolvedValueOnce({ id: "ent-2" });
    prismaMock.user.create.mockResolvedValueOnce({ id: 7, email: "staff@example.com", role: "STUDENT" });

    await svc.signUp({
      enterpriseCode: "ENT2",
      email: "staff@example.com",
      password: "pw",
      role: "STAFF",
    } as any);

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "STUDENT" }),
      }),
    );
  });

  it("signUp rejects missing enterprise code, unknown enterprise, and taken email", async () => {
    const svc = await loadService();

    await expect(
      svc.signUp({ enterpriseCode: "   ", email: "a@b.com", password: "pw" }),
    ).rejects.toMatchObject({ code: "ENTERPRISE_CODE_REQUIRED" });

    prismaMock.enterprise.findUnique.mockResolvedValueOnce(null);
    await expect(
      svc.signUp({ enterpriseCode: "MISS", email: "a@b.com", password: "pw" }),
    ).rejects.toMatchObject({ code: "ENTERPRISE_NOT_FOUND" });

    prismaMock.enterprise.findUnique.mockResolvedValueOnce({ id: "ent-1" });
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 9 });
    await expect(
      svc.signUp({ enterpriseCode: "ENT", email: "a@b.com", password: "pw" }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("acceptEnterpriseAdminInvite rejects invalid, used, and expired tokens", async () => {
    const svc = await loadService();

    prismaMock.enterpriseAdminInviteToken.findUnique.mockResolvedValueOnce(null);
    await expect(
      svc.acceptEnterpriseAdminInvite({ token: "token-1", newPassword: "pw-1" }),
    ).rejects.toMatchObject({ code: "INVALID_ENTERPRISE_ADMIN_INVITE" });

    prismaMock.enterpriseAdminInviteToken.findUnique.mockResolvedValueOnce({
      id: 11,
      enterpriseId: "ent-1",
      email: "invitee@example.com",
      revoked: true,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      svc.acceptEnterpriseAdminInvite({ token: "token-2", newPassword: "pw-2" }),
    ).rejects.toMatchObject({ code: "USED_ENTERPRISE_ADMIN_INVITE" });

    prismaMock.enterpriseAdminInviteToken.findUnique.mockResolvedValueOnce({
      id: 12,
      enterpriseId: "ent-1",
      email: "invitee@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
    });
    await expect(
      svc.acceptEnterpriseAdminInvite({ token: "token-3", newPassword: "pw-3" }),
    ).rejects.toMatchObject({ code: "EXPIRED_ENTERPRISE_ADMIN_INVITE" });
  });

  it("getEnterpriseAdminInviteState reports mode based on existing account presence", async () => {
    const svc = await loadService();

    prismaMock.enterpriseAdminInviteToken.findUnique.mockResolvedValue({
      id: 18,
      enterpriseId: "ent-1",
      email: "invitee@example.com",
      revoked: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.findFirst.mockReset();
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.findFirst.mockResolvedValueOnce(null);

    await expect(svc.getEnterpriseAdminInviteState({ token: "token-state-new" })).resolves.toEqual({
      mode: "new_account",
    });

    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 2 });

    await expect(svc.getEnterpriseAdminInviteState({ token: "token-state-existing" })).resolves.toEqual({
      mode: "existing_account",
    });
  });
});
