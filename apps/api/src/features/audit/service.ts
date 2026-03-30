import { prisma } from "../../shared/db.js";
import { broadcastAuditEvent } from "./sse.js";

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

  const entry = await prisma.auditLog.create({
    data: {
      userId: params.userId,
      enterpriseId,
      action: params.action as any,
      ip: params.ip?.slice(0, 64) ?? null,
      userAgent: params.userAgent?.slice(0, 500) ?? null,
    },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
    },
  });

  broadcastAuditEvent(enterpriseId, {
    id: entry.id,
    action: entry.action,
    createdAt: entry.createdAt,
    ip: entry.ip,
    userAgent: entry.userAgent,
    user: entry.user,
  });
}

/** Returns the audit logs with optional cursor for pagination. */
export async function listAuditLogs(options: {
  enterpriseId: string;
  from?: Date;
  to?: Date;
  limit?: number;
  cursor?: number;
}) {
  const { enterpriseId, from, to, limit = 200, cursor } = options;
  const where: any = { enterpriseId };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }
  if (cursor) {
    where.id = { lt: cursor };
  }

  return prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { id: "desc" },
    take: Math.min(limit, 500),
  });
}