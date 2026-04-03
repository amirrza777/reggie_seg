import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAuditLogs, recordAuditLog } from "./service.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    auditLogIntegrity: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("audit service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
    (prisma.auditLogIntegrity.findUnique as any).mockResolvedValue(null);
    (prisma.auditLog.count as any).mockResolvedValue(0);
    (prisma.auditLog.findFirst as any).mockResolvedValue(null);
  });

  it("recordAuditLog skips insert when user does not exist", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    await recordAuditLog({ userId: 10, action: "LOGIN_SUCCESS" as any });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 10 },
      select: { enterpriseId: true },
    });
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("recordAuditLog inserts with trimmed ip and userAgent", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ enterpriseId: "ent-1" });
    (prisma.auditLog.create as any).mockResolvedValue({
      id: 5,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await recordAuditLog({
      userId: 5,
      action: "LOGIN_FAILED" as any,
      ip: "1".repeat(80),
      userAgent: "x".repeat(700),
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 5,
        enterpriseId: "ent-1",
        action: "LOGIN_FAILED",
        ip: "1".repeat(64),
        userAgent: "x".repeat(500),
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
      },
    });
  });

  it("recordAuditLog rebuilds stale integrity snapshot instead of failing writes", async () => {
    const lastCreatedAt = new Date("2026-01-01T00:00:00.000Z");
    (prisma.user.findUnique as any).mockResolvedValue({ enterpriseId: "ent-1" });
    (prisma.auditLogIntegrity.findUnique as any).mockResolvedValueOnce({
      logCount: 1,
      lastLogId: 1,
      lastLogCreatedAt: lastCreatedAt,
      signature: "invalid-signature",
    });
    (prisma.auditLog.count as any).mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    (prisma.auditLog.findFirst as any).mockResolvedValueOnce({ id: 1, createdAt: lastCreatedAt });
    (prisma.auditLog.create as any).mockResolvedValue({
      id: 2,
      action: "LOGIN",
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      ip: null,
      userAgent: null,
      user: { id: 5, email: "u@x.com", firstName: "U", lastName: "X", role: "STUDENT" },
    });

    await expect(recordAuditLog({ userId: 5, action: "LOGIN" as any })).resolves.toBeUndefined();

    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLogIntegrity.upsert).toHaveBeenCalledTimes(2);
  });

  it("listAuditLogs applies optional date filters and limit cap", async () => {
    (prisma.auditLog.findMany as any).mockResolvedValue([]);
    const from = new Date("2026-01-01T00:00:00.000Z");
    const to = new Date("2026-02-01T00:00:00.000Z");

    await listAuditLogs({
      enterpriseId: "ent-2",
      from,
      to,
      limit: 9999,
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: {
        enterpriseId: "ent-2",
        createdAt: { gte: from, lte: to },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { id: "desc" },
      take: 500,
    });
  });

  it("listAuditLogs rebuilds stale integrity snapshot before returning logs", async () => {
    const lastCreatedAt = new Date("2026-02-01T00:00:00.000Z");
    (prisma.auditLogIntegrity.findUnique as any).mockResolvedValueOnce({
      logCount: 3,
      lastLogId: 9,
      lastLogCreatedAt: lastCreatedAt,
      signature: "invalid-signature",
    });
    (prisma.auditLog.count as any).mockResolvedValueOnce(3);
    (prisma.auditLog.findFirst as any).mockResolvedValueOnce({ id: 9, createdAt: lastCreatedAt });
    (prisma.auditLog.findMany as any).mockResolvedValueOnce([]);

    const result = await listAuditLogs({ enterpriseId: "ent-2" });

    expect(result).toEqual([]);
    expect(prisma.auditLogIntegrity.upsert).toHaveBeenCalled();
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: { enterpriseId: "ent-2" },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { id: "desc" },
      take: 200,
    });
  });
});
