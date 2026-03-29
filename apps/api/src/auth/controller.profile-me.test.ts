import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import { prisma } from "../shared/db.js";
import {
  updateProfileHandler,
  requestEmailChangeHandler,
  confirmEmailChangeHandler,
  meHandler,
} from "./controller.js";

vi.mock("./service.js", () => ({
  signUp: vi.fn(),
  login: vi.fn(),
  refreshTokens: vi.fn(),
  logout: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  requestEmailChange: vi.fn(),
  confirmEmailChange: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

vi.mock("../shared/db.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    refreshToken: {
      updateMany: vi.fn(),
    },
  },
}));

function mockResponse() {
  const res: Partial<Response> & {
    cookie: ReturnType<typeof vi.fn>;
    clearCookie: ReturnType<typeof vi.fn>;
  } = {
    status: vi.fn(),
    json: vi.fn(),
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  };
  (res.status as any).mockReturnValue(res);
  (res.json as any).mockReturnValue(res);
  return res as Response & { cookie: ReturnType<typeof vi.fn>; clearCookie: ReturnType<typeof vi.fn> };
}

describe("auth controller profile/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updateProfileHandler maps auth/success/error", async () => {
    const res = mockResponse();

    await updateProfileHandler({ body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(401);

    (service.updateProfile as any).mockResolvedValueOnce({ id: 1, firstName: "A" });
    await updateProfileHandler({ user: { sub: 1 }, body: { firstName: "A" } } as any, res as any);
    expect(service.updateProfile).toHaveBeenCalledWith({
      userId: 1,
      firstName: "A",
      lastName: undefined,
      avatarBase64: undefined,
      avatarMime: undefined,
    });
    expect(res.json).toHaveBeenLastCalledWith({ id: 1, firstName: "A" });

    (service.updateProfile as any).mockRejectedValueOnce(new Error("db"));
    await updateProfileHandler({ user: { sub: 1 }, body: {} } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("requestEmailChangeHandler maps auth/validation/success/errors", async () => {
    const res = mockResponse();

    await requestEmailChangeHandler({ body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(401);

    await requestEmailChangeHandler({ user: { sub: 1 }, body: {} } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.requestEmailChange as any).mockResolvedValueOnce(undefined);
    await requestEmailChangeHandler({ user: { sub: 1 }, body: { newEmail: "next@x.com" } } as any, res as any);
    expect(res.json).toHaveBeenLastCalledWith({ success: true });

    (service.requestEmailChange as any).mockRejectedValueOnce({ code: "EMAIL_TAKEN" });
    await requestEmailChangeHandler({ user: { sub: 1 }, body: { newEmail: "next@x.com" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(409);

    (service.requestEmailChange as any).mockRejectedValueOnce(new Error("db"));
    await requestEmailChangeHandler({ user: { sub: 1 }, body: { newEmail: "next@x.com" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("confirmEmailChangeHandler maps auth/validation/success/errors", async () => {
    const res = mockResponse();

    await confirmEmailChangeHandler({ body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(401);

    await confirmEmailChangeHandler({ user: { sub: 1 }, body: { newEmail: "a@b.com" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.confirmEmailChange as any).mockResolvedValueOnce(undefined);
    await confirmEmailChangeHandler({ user: { sub: 1 }, body: { newEmail: "a@b.com", code: "1234" } } as any, res as any);
    expect(res.json).toHaveBeenLastCalledWith({ success: true });

    (service.confirmEmailChange as any).mockRejectedValueOnce({ code: "INVALID_EMAIL_CODE" });
    await confirmEmailChangeHandler({ user: { sub: 1 }, body: { newEmail: "a@b.com", code: "1234" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(400);

    (service.confirmEmailChange as any).mockRejectedValueOnce(new Error("db"));
    await confirmEmailChangeHandler({ user: { sub: 1 }, body: { newEmail: "a@b.com", code: "1234" } } as any, res as any);
    expect(res.status).toHaveBeenLastCalledWith(500);
  });

  it("meHandler returns 401 when neither access user nor refresh cookie exists", async () => {
    const res = mockResponse();
    await meHandler({ cookies: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("meHandler falls back to refresh token and handles missing user", async () => {
    const res = mockResponse();
    (service.verifyRefreshToken as any).mockReturnValueOnce({ sub: 42 });
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);

    await meHandler({ cookies: { refresh_token: "rt" } } as any, res as any);

    expect(service.verifyRefreshToken).toHaveBeenCalledWith("rt");
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("meHandler revokes refresh tokens for suspended users", async () => {
    const res = mockResponse();
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 9,
      role: "STUDENT",
      active: false,
      enterprise: { name: "KCL" },
    });

    await meHandler({ user: { sub: 9 } } as any, res as any);

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({ where: { userId: 9, revoked: false }, data: { revoked: true } });
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("meHandler returns profile flags for role and active default", async () => {
    const res = mockResponse();
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 7,
      role: "ENTERPRISE_ADMIN",
      active: undefined,
      enterprise: { name: "KCL University" },
      _count: { moduleLeads: 0, moduleTeachingAssistants: 0 },
    });
    (service.getProfile as any).mockResolvedValueOnce({ id: 7, email: "a@b.com", firstName: "A", lastName: "B" });

    await meHandler({ user: { sub: 7 } } as any, res as any);

    expect(res.json).toHaveBeenCalledWith({
      id: 7,
      email: "a@b.com",
      firstName: "A",
      lastName: "B",
      enterpriseName: "KCL University",
      isStaff: true,
      isAdmin: false,
      isEnterpriseAdmin: true,
      role: "ENTERPRISE_ADMIN",
      active: true,
    });
  });

  it("meHandler treats student teaching assistants as staff-space users", async () => {
    const res = mockResponse();
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 21,
      role: "STUDENT",
      active: true,
      enterprise: { name: "KCL University" },
      _count: { moduleLeads: 0, moduleTeachingAssistants: 1 },
    });
    (service.getProfile as any).mockResolvedValueOnce({ id: 21, email: "ta@student.com", firstName: "TA", lastName: "Student" });

    await meHandler({ user: { sub: 21 } } as any, res as any);

    expect(res.json).toHaveBeenCalledWith({
      id: 21,
      email: "ta@student.com",
      firstName: "TA",
      lastName: "Student",
      enterpriseName: "KCL University",
      isStaff: true,
      isAdmin: false,
      isEnterpriseAdmin: false,
      role: "STUDENT",
      active: true,
    });
  });

  it("meHandler catches refresh verification errors", async () => {
    const res = mockResponse();
    (service.verifyRefreshToken as any).mockImplementationOnce(() => {
      throw new Error("bad token");
    });

    await meHandler({ cookies: { refresh_token: "rt" } } as any, res as any);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Not authenticated" });
  });

  it("meHandler catches downstream profile errors", async () => {
    const res = mockResponse();
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 8,
      role: "ADMIN",
      active: true,
      enterprise: { name: "KCL Universtity" },
      _count: { moduleLeads: 0, moduleTeachingAssistants: 0 },
    });
    (service.getProfile as any).mockRejectedValueOnce(new Error("boom"));

    await meHandler({ user: { sub: 8 } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("uses code or string detail fallback for profile/email change errors", async () => {
    let res = mockResponse();
    (service.updateProfile as any).mockRejectedValueOnce({});
    await updateProfileHandler({ user: { sub: 1 }, body: {} } as any, res as any);
    expect(res.json).toHaveBeenLastCalledWith({ error: "update profile failed", detail: "[object Object]" });

    res = mockResponse();
    (service.requestEmailChange as any).mockRejectedValueOnce({ code: "UNEXPECTED_EMAIL_CHANGE" });
    await requestEmailChangeHandler({ user: { sub: 1 }, body: { newEmail: "a@b.com" } } as any, res as any);
    expect(res.json).toHaveBeenLastCalledWith({
      error: "email change request failed",
      detail: "UNEXPECTED_EMAIL_CHANGE",
    });

    res = mockResponse();
    (service.requestEmailChange as any).mockRejectedValueOnce({});
    await requestEmailChangeHandler({ user: { sub: 1 }, body: { newEmail: "a@b.com" } } as any, res as any);
    expect(res.json).toHaveBeenLastCalledWith({
      error: "email change request failed",
      detail: "[object Object]",
    });

    res = mockResponse();
    (service.confirmEmailChange as any).mockRejectedValueOnce({});
    await confirmEmailChangeHandler({ user: { sub: 1 }, body: { newEmail: "a@b.com", code: "1234" } } as any, res as any);
    expect(res.json).toHaveBeenLastCalledWith({
      error: "email change confirm failed",
      detail: "[object Object]",
    });
  });
});
