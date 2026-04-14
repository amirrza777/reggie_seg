/* eslint-disable max-lines-per-function */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  applyEnv,
  emailMock,
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
  it("requestEmailChange handles user missing, email taken, and success", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(svc.requestEmailChange({ userId: 1, newEmail: "next@x.com" })).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
    });

    prismaMock.user.findUnique.mockResolvedValueOnce({ enterpriseId: "ent-1" });
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 2 });
    await expect(svc.requestEmailChange({ userId: 1, newEmail: "next@x.com" })).rejects.toMatchObject({
      code: "EMAIL_TAKEN",
    });

    prismaMock.user.findUnique.mockResolvedValueOnce({ enterpriseId: "ent-1" });
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await svc.requestEmailChange({ userId: 1, newEmail: "Next@X.com" });

    expect(prismaMock.emailChangeToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 1, newEmail: "next@x.com", codeHash: expect.any(String), expiresAt: expect.any(Date) }),
    });
    expect(emailMock.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "next@x.com", subject: "Verify your new email", text: expect.stringContaining("verification code"), html: expect.stringContaining("<strong") }),
    );
  });

  it("confirmEmailChange maps invalid code and success transaction", async () => {
    const svc = await loadService();

    prismaMock.emailChangeToken.findFirst.mockResolvedValueOnce(null);
    await expect(
      svc.confirmEmailChange({ userId: 1, newEmail: "next@x.com", code: "1234" }),
    ).rejects.toMatchObject({ code: "INVALID_EMAIL_CODE" });

    prismaMock.emailChangeToken.findFirst.mockResolvedValueOnce({ id: 5 });
    prismaMock.user.update.mockResolvedValueOnce({ id: 1 });
    prismaMock.emailChangeToken.updateMany.mockResolvedValueOnce({ count: 2 });
    prismaMock.refreshToken.updateMany.mockResolvedValueOnce({ count: 4 });

    await svc.confirmEmailChange({ userId: 1, newEmail: "NEXT@X.COM", code: " 1234 " });
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it("joinEnterpriseByCode rejects missing code and non-unassigned users", async () => {
    const svc = await loadService();

    await expect(svc.joinEnterpriseByCode({ userId: 1, enterpriseCode: "   " })).rejects.toMatchObject({
      code: "ENTERPRISE_CODE_REQUIRED",
    });

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 1,
      email: "user@example.com",
      role: "STUDENT",
      active: true,
      enterprise: { code: "DEFAULT" },
    });
    await expect(svc.joinEnterpriseByCode({ userId: 1, enterpriseCode: "ENT2" })).rejects.toMatchObject({
      code: "ENTERPRISE_JOIN_NOT_ALLOWED",
    });
  });

  it("joinEnterpriseByCode returns blocked when the enterprise has a suspended account for the email", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 7,
        email: "user@example.com",
        role: "STUDENT",
        active: true,
        blockedEnterpriseId: null,
        enterprise: { code: "UNASSIGNED" },
      })
      .mockResolvedValueOnce({
        id: 88,
        active: false,
      });
    prismaMock.enterprise.findUnique.mockResolvedValueOnce({ id: "ent-2", name: "Enterprise Two" });

    await expect(svc.joinEnterpriseByCode({ userId: 7, enterpriseCode: "ENT2" })).rejects.toMatchObject({
      code: "ENTERPRISE_ACCESS_BLOCKED",
    });
  });

  it("joinEnterpriseByCode returns blocked when enterprise admin previously removed the account", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 7,
      email: "user@example.com",
      role: "STUDENT",
      active: true,
      blockedEnterpriseId: "ent-2",
      enterprise: { code: "UNASSIGNED" },
    });
    prismaMock.enterprise.findUnique.mockResolvedValueOnce({ id: "ent-2", name: "Enterprise Two" });

    await expect(svc.joinEnterpriseByCode({ userId: 7, enterpriseCode: "ENT2" })).rejects.toMatchObject({
      code: "ENTERPRISE_ACCESS_BLOCKED",
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("joinEnterpriseByCode moves unassigned users into the target enterprise", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 7,
        email: "user@example.com",
        role: "STUDENT",
        active: true,
        blockedEnterpriseId: null,
        enterprise: { code: "UNASSIGNED" },
      })
      .mockResolvedValueOnce(null);
    prismaMock.enterprise.findUnique.mockResolvedValueOnce({ id: "ent-2", name: "Enterprise Two" });

    const result = await svc.joinEnterpriseByCode({ userId: 7, enterpriseCode: "ENT2" });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        enterpriseId: "ent-2",
        blockedEnterpriseId: null,
        role: "STUDENT",
        active: true,
      },
    });
    expect(result).toEqual({
      enterpriseId: "ent-2",
      enterpriseName: "Enterprise Two",
    });
  });

  it("joinEnterpriseByCode preserves the blocked enterprise marker for previously removed users", async () => {
    const svc = await loadService();

    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 7,
        email: "user@example.com",
        role: "STUDENT",
        active: true,
        blockedEnterpriseId: "ent-1",
        enterprise: { code: "UNASSIGNED" },
      })
      .mockResolvedValueOnce(null);
    prismaMock.enterprise.findUnique.mockResolvedValueOnce({ id: "ent-2", name: "Enterprise Two" });

    await svc.joinEnterpriseByCode({ userId: 7, enterpriseCode: "ENT2" });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        enterpriseId: "ent-2",
        blockedEnterpriseId: "ent-1",
        role: "STUDENT",
        active: true,
      },
    });
  });
});
