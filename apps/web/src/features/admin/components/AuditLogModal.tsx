"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { listAuditLogs } from "../api/client";
import type { AuditLogEntry } from "../types";

type RequestState = "idle" | "loading" | "success" | "error";
type RangeKey = "today" | "week" | "month" | "quarter" | "year" | "all";

const ranges: { key: RangeKey; label: string; days?: number }[] = [
  { key: "today", label: "Today", days: 1 },
  { key: "week", label: "Last 7 days", days: 7 },
  { key: "month", label: "Last 30 days", days: 30 },
  { key: "quarter", label: "Last 90 days", days: 90 },
  { key: "year", label: "This year", days: 365 },
  { key: "all", label: "All time" },
];

const formatRelative = (date: Date) => {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

const formatAbsolute = (date: Date) =>
  date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

function rangeToDates(key: RangeKey): { from?: string; to?: string } {
  if (key === "all") return {};
  const now = new Date();
  const start = new Date(now);
  const days = ranges.find((r) => r.key === key)?.days ?? 0;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const to = new Date(now);
  return { from: start.toISOString(), to: to.toISOString() };
}

function toCsv(logs: AuditLogEntry[]) {
  const header = ["timestamp", "user", "email", "role", "action", "ip", "userAgent"];
  const rows = logs.map((entry) => [
    entry.createdAt,
    `${entry.user.firstName} ${entry.user.lastName}`.trim(),
    entry.user.email,
    entry.user.role,
    entry.action,
    entry.ip ?? "",
    (entry.userAgent ?? "").replace(/\\s+/g, " "),
  ]);
  return [header, ...rows].map((row) => row.map((v) => `"${String(v).replace(/\"/g, '""')}"`).join(",")).join("\\n");
}

export function AuditLogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [range, setRange] = useState<RangeKey>("today");
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [status, setStatus] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const activeRange = useMemo(() => rangeToDates(range), [range]);

  const fetchLogs = useCallback(async () => {
    if (!open) return;
    setStatus("loading");
    setMessage(null);
    try {
      const entries = await listAuditLogs({
        from: activeRange.from,
        to: activeRange.to,
        limit: 300,
      });
      setLogs(entries);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not load audit logs.");
    }
  }, [open, activeRange.from, activeRange.to]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const downloadCsv = () => {
    const csv = toCsv(logs);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="audit-log-title">
      <div className="modal__dialog admin-modal" style={{ width: "min(980px, 100%)" }}>
        <div className="modal__header" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div className="stack" style={{ gap: 6 }}>
            <h3 id="audit-log-title" style={{ margin: 0 }}>
              Audit log
            </h3>
            <p className="muted" style={{ margin: 0 }}>
              Login and logout events filtered by time range.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="button" variant="ghost" onClick={downloadCsv} disabled={!logs.length}>
              Download CSV
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="modal__body audit-modal__body">
          <div className="audit-filters">
            <div className="audit-filters__pills">
              {ranges.map((item) => {
                const active = item.key === range;
                const variant = active ? "primary" : "ghost";
                return (
                  <Button
                    key={item.key}
                    type="button"
                    variant={variant}
                    className="audit-pill"
                    onClick={() => setRange(item.key)}
                    disabled={status === "loading"}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={fetchLogs}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Loading..." : "Refresh"}
            </Button>
          </div>

          {message ? (
            <div
              className={status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success"}
              style={{ padding: "10px 12px" }}
            >
              <span style={{ fontSize: 16 }}>{status === "error" ? "⚠️" : "✅"}</span>
              <span>{message}</span>
            </div>
          ) : null}

          <div className="table audit-modal__table">
            <div className="table__head audit-modal__head">
              <div>Time</div>
              <div>User</div>
              <div>Action</div>
              <div>IP / Agent</div>
              <div>Details</div>
            </div>
            <div className="audit-modal__rows">
              {logs.length === 0 ? (
                <div className="table__row audit-modal__row">
                  <div className="muted" style={{ gridColumn: "1 / -1" }}>
                    No events in this range.
                  </div>
                </div>
              ) : (
                logs.map((entry) => {
                  const createdAt = new Date(entry.createdAt);
                  return (
                    <div key={entry.id} className="table__row audit-modal__row">
                      <div className="stack" style={{ gap: 4 }}>
                        <strong>{formatRelative(createdAt)}</strong>
                        <span className="muted">{formatAbsolute(createdAt)}</span>
                      </div>
                      <div className="stack" style={{ gap: 4 }}>
                        <strong>{`${entry.user.firstName} ${entry.user.lastName}`}</strong>
                        <span className="muted">{entry.user.role}</span>
                        <span className="muted" style={{ fontSize: "0.95rem" }}>
                          {entry.user.email}
                        </span>
                      </div>
                      <div className="stack" style={{ gap: 6 }}>
                        <span className={`audit-badge audit-badge--${entry.action.toLowerCase()}`}>
                          {entry.action}
                        </span>
                      </div>
                      <div className="stack" style={{ gap: 6 }}>
                        <span style={{ fontWeight: 600 }}>{entry.ip ?? "—"}</span>
                        <span className="muted" style={{ whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
                          {entry.userAgent ?? "—"}
                        </span>
                      </div>
                      <div className="stack" style={{ gap: 4 }}>
                        <span className="muted">Login/logout record</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
