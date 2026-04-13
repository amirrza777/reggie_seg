import { listAuditLogs } from "../../audit/service.js";

export async function getAuditLogs(enterpriseId: string, filters: { from?: Date; to?: Date; limit?: number; cursor?: number }) {
  const logs = await listAuditLogs({ enterpriseId, ...filters });
  return logs.map((entry) => ({
    id: entry.id,
    action: entry.action,
    createdAt: entry.createdAt,
    ip: entry.ip,
    userAgent: entry.userAgent,
    user: {
      id: entry.user.id,
      email: entry.user.email,
      firstName: entry.user.firstName,
      lastName: entry.user.lastName,
      role: entry.user.role,
    },
  }));
}
