import { prisma } from "../../shared/db.js";
import type { AuditAction } from "@prisma/client";

type AuditMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

export async function recordAuditLog(params: { userId: number; action: AuditAction } & AuditMeta) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { enterpriseId: true },
  });
  if (!user) return;

  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      enterpriseId: user.enterpriseId,
      action: params.action,
      ip: params.ip?.slice(0, 64) ?? null,
      userAgent: params.userAgent?.slice(0, 500) ?? null,
    },
  });
}

export async function listAuditLogs(options: {
  enterpriseId: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  const { enterpriseId, from, to, limit = 200 } = options;
  const where: any = { enterpriseId };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  return prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 500),
  });
}
