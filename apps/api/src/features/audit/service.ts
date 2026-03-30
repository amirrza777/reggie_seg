import { prisma } from "../../shared/db.js";
import { Prisma } from "@prisma/client";
import { createHmac } from "node:crypto";
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

const DEFAULT_AUDIT_RETENTION_DAYS = 365;
const INTEGRITY_SIGNATURE_VERSION = "v1";
const MAX_SERIALIZABLE_RETRIES = 3;
const AUDIT_INTEGRITY_ERROR = "Audit log integrity check failed. Possible tampering detected.";

const auditIntegritySecret = resolveAuditIntegritySecret();

type IntegritySnapshot = {
  logCount: number;
  lastLogId: number | null;
  lastLogCreatedAt: Date | null;
  signature: string;
};

type AuditDbClient = Pick<typeof prisma, "auditLog" | "auditLogIntegrity">;

function resolveAuditIntegritySecret() {
  const directSecret = process.env.AUDIT_LOG_INTEGRITY_SECRET?.trim();
  if (directSecret) return directSecret;
  const accessSecret = process.env.JWT_ACCESS_SECRET?.trim();
  if (accessSecret) return accessSecret;
  const refreshSecret = process.env.JWT_REFRESH_SECRET?.trim();
  if (refreshSecret) return refreshSecret;
  return "dev-audit-integrity-secret";
}

function signIntegritySnapshot(input: {
  enterpriseId: string;
  logCount: number;
  lastLogId: number | null;
  lastLogCreatedAt: Date | null;
}) {
  const payload = [
    INTEGRITY_SIGNATURE_VERSION,
    input.enterpriseId,
    String(input.logCount),
    input.lastLogId === null ? "null" : String(input.lastLogId),
    input.lastLogCreatedAt ? input.lastLogCreatedAt.toISOString() : "null",
  ].join("|");
  return createHmac("sha256", auditIntegritySecret).update(payload).digest("hex");
}

function isIntegritySnapshotSignatureValid(enterpriseId: string, snapshot: IntegritySnapshot) {
  const expected = signIntegritySnapshot({
    enterpriseId,
    logCount: snapshot.logCount,
    lastLogId: snapshot.lastLogId,
    lastLogCreatedAt: snapshot.lastLogCreatedAt,
  });
  return expected === snapshot.signature;
}

function isRetryableSerializableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? (error as { code?: unknown }).code : null;
  return code === "P2034";
}

async function withSerializableRetry<T>(task: (tx: Prisma.TransactionClient) => Promise<T>) {
  let attempt = 0;
  while (attempt < MAX_SERIALIZABLE_RETRIES) {
    attempt += 1;
    try {
      return await prisma.$transaction((tx) => task(tx), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isRetryableSerializableError(error) || attempt >= MAX_SERIALIZABLE_RETRIES) {
        throw error;
      }
    }
  }
  throw new Error("Could not complete audit write transaction.");
}

async function upsertAuditIntegritySnapshot(
  db: AuditDbClient,
  enterpriseId: string,
  logCount: number,
  lastLogId: number | null,
  lastLogCreatedAt: Date | null,
) {
  const signature = signIntegritySnapshot({
    enterpriseId,
    logCount,
    lastLogId,
    lastLogCreatedAt,
  });
  await db.auditLogIntegrity.upsert({
    where: { enterpriseId },
    create: {
      enterpriseId,
      logCount,
      lastLogId,
      lastLogCreatedAt,
      signature,
    },
    update: {
      logCount,
      lastLogId,
      lastLogCreatedAt,
      signature,
    },
  });
}

async function rebuildAuditIntegritySnapshotForEnterprise(
  enterpriseId: string,
  db: AuditDbClient = prisma,
) {
  const [logCount, latest] = await Promise.all([
    db.auditLog.count({ where: { enterpriseId } }),
    db.auditLog.findFirst({
      where: { enterpriseId },
      orderBy: { id: "desc" },
      select: { id: true, createdAt: true },
    }),
  ]);

  await upsertAuditIntegritySnapshot(
    db,
    enterpriseId,
    logCount,
    latest?.id ?? null,
    latest?.createdAt ?? null,
  );
}

async function verifyAuditIntegritySnapshot(enterpriseId: string) {
  const snapshot = await prisma.auditLogIntegrity.findUnique({
    where: { enterpriseId },
    select: { logCount: true, lastLogId: true, lastLogCreatedAt: true, signature: true },
  });

  if (!snapshot) {
    await rebuildAuditIntegritySnapshotForEnterprise(enterpriseId);
    return;
  }

  if (!isIntegritySnapshotSignatureValid(enterpriseId, snapshot)) {
    throw new Error(AUDIT_INTEGRITY_ERROR);
  }

  const [actualCount, latest] = await Promise.all([
    prisma.auditLog.count({ where: { enterpriseId } }),
    prisma.auditLog.findFirst({
      where: { enterpriseId },
      orderBy: { id: "desc" },
      select: { id: true, createdAt: true },
    }),
  ]);

  const actualLastLogId = latest?.id ?? null;
  const actualLastLogCreatedAt = latest?.createdAt ?? null;
  const hasMatchingCount = actualCount === snapshot.logCount;
  const hasMatchingLastLogId = actualLastLogId === snapshot.lastLogId;
  const hasMatchingLastLogCreatedAt =
    (actualLastLogCreatedAt?.getTime() ?? -1) === (snapshot.lastLogCreatedAt?.getTime() ?? -1);

  if (!hasMatchingCount || !hasMatchingLastLogId || !hasMatchingLastLogCreatedAt) {
    throw new Error(AUDIT_INTEGRITY_ERROR);
  }
}

export function getAuditLogRetentionDays() {
  const parsed = Number(process.env.AUDIT_LOG_RETENTION_DAYS ?? DEFAULT_AUDIT_RETENTION_DAYS);
  if (!Number.isFinite(parsed)) return DEFAULT_AUDIT_RETENTION_DAYS;
  return Math.max(1, Math.floor(parsed));
}

export async function purgeExpiredAuditLogs(referenceTime = new Date()) {
  const retentionDays = getAuditLogRetentionDays();
  const cutoff = new Date(referenceTime);
  cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);

  const affectedEnterprises = await prisma.auditLog.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { enterpriseId: true },
    distinct: ["enterpriseId"],
  });

  if (affectedEnterprises.length === 0) return 0;

  const deleted = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  for (const { enterpriseId } of affectedEnterprises) {
    await rebuildAuditIntegritySnapshotForEnterprise(enterpriseId);
  }

  return deleted.count;
}

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

  const entry = await withSerializableRetry(async (tx) => {
    const existingSnapshot = await tx.auditLogIntegrity.findUnique({
      where: { enterpriseId },
      select: { logCount: true, lastLogId: true, lastLogCreatedAt: true, signature: true },
    });

    if (existingSnapshot && !isIntegritySnapshotSignatureValid(enterpriseId, existingSnapshot)) {
      throw new Error(AUDIT_INTEGRITY_ERROR);
    }

    const countBeforeInsert = await tx.auditLog.count({ where: { enterpriseId } });

    const createdEntry = await tx.auditLog.create({
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

    await upsertAuditIntegritySnapshot(
      tx,
      enterpriseId,
      countBeforeInsert + 1,
      createdEntry.id,
      createdEntry.createdAt,
    );

    return createdEntry;
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
  await verifyAuditIntegritySnapshot(enterpriseId);

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