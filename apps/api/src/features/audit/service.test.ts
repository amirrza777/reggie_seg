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
      findMany: vi.fn(),
    },
  },
}));

describe("audit service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    });
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
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  });
});
