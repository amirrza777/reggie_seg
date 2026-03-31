import cron from "node-cron";
import { getAuditLogRetentionDays, purgeExpiredAuditLogs } from "./service.js";

const DEFAULT_AUDIT_RETENTION_CRON = "30 3 * * *";

function getAuditRetentionCronSchedule() {
  return process.env.AUDIT_LOG_RETENTION_CRON?.trim() || DEFAULT_AUDIT_RETENTION_CRON;
}

/** Starts periodic audit retention cleanup. */
export function startAuditRetentionJob() {
  const retentionDays = getAuditLogRetentionDays();
  const schedule = getAuditRetentionCronSchedule();

  void purgeExpiredAuditLogs()
    .then((deletedCount) => {
      if (deletedCount > 0) {
        console.log(
          `Audit retention cleanup removed ${deletedCount} log entries older than ${retentionDays} day${retentionDays === 1 ? "" : "s"}.`,
        );
      }
    })
    .catch((error) => {
      console.error("Audit retention cleanup error:", error);
    });

  cron.schedule(schedule, async () => {
    try {
      const deletedCount = await purgeExpiredAuditLogs();
      if (deletedCount > 0) {
        console.log(
          `Audit retention cleanup removed ${deletedCount} log entries older than ${retentionDays} day${retentionDays === 1 ? "" : "s"}.`,
        );
      }
    } catch (error) {
      console.error("Audit retention cleanup error:", error);
    }
  });
}