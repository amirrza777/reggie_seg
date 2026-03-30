import { prisma } from "../../shared/db.js";

export type AuditEventAction =
  | "LOGIN"
  | "LOGOUT"
  | "USER_ROLE_CHANGED"
  | "USER_UPDATED"
  | "ENTERPRISE_CREATED"
  | "ENTERPRISE_DELETED";

type AuditMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

/** Records the audit log. Accepts an optional enterpriseId to skip the user lookup query. */
export async function recordAuditLog(
  params: { userId: number; action: AuditEventAction; enterpriseId?: string } & AuditMeta
) {
  let { enterpriseId } = params;

  if (!enterpriseId) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { enterpriseId: true },
    });
    if (!user) return;
    enterpriseId = user.enterpriseId;
  }

  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      enterpriseId,
      action: params.action as any,
      ip: params.ip?.slice(0, 64) ?? null,
      userAgent: params.userAgent?.slice(0, 500) ?? null,
    },
  });
}

/** Returns the audit logs. */
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