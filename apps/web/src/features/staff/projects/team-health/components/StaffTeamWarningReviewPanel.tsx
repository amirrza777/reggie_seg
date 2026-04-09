"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { resolveStaffTeamWarning } from "@/features/projects/api/client";
import type { TeamWarning } from "@/features/projects/types";

type StaffTeamWarningReviewPanelProps = {
  userId: number;
  projectId: number;
  teamId: number;
  initialWarnings: TeamWarning[];
  initialError?: string | null;
};

const WARNING_PAGE_SIZE = 5;

function toTimestamp(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} UTC`;
}

export function StaffTeamWarningReviewPanel({
  userId,
  projectId,
  teamId,
  initialWarnings,
  initialError = null,
}: StaffTeamWarningReviewPanelProps) {
  const router = useRouter();
  const [warnings, setWarnings] = useState(initialWarnings);
  const [panelError, setPanelError] = useState<string | null>(initialError);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [resolvingWarningId, setResolvingWarningId] = useState<number | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [resolvedPage, setResolvedPage] = useState(1);

  const activeWarnings = useMemo(
    () =>
      warnings
        .filter((warning) => warning.active)
        .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt)),
    [warnings],
  );
  const resolvedWarnings = useMemo(
    () =>
      warnings
        .filter((warning) => !warning.active)
        .sort((a, b) => toTimestamp(b.resolvedAt ?? b.updatedAt) - toTimestamp(a.resolvedAt ?? a.updatedAt)),
    [warnings],
  );
  const activePageCount = Math.max(1, Math.ceil(activeWarnings.length / WARNING_PAGE_SIZE));
  const resolvedPageCount = Math.max(1, Math.ceil(resolvedWarnings.length / WARNING_PAGE_SIZE));
  const pagedActiveWarnings = useMemo(() => {
    const start = (activePage - 1) * WARNING_PAGE_SIZE;
    return activeWarnings.slice(start, start + WARNING_PAGE_SIZE);
  }, [activePage, activeWarnings]);
  const pagedResolvedWarnings = useMemo(() => {
    const start = (resolvedPage - 1) * WARNING_PAGE_SIZE;
    return resolvedWarnings.slice(start, start + WARNING_PAGE_SIZE);
  }, [resolvedPage, resolvedWarnings]);

  const compactPanelStyle = { padding: 12, gap: 10, fontSize: "var(--fs-fixed-0-92rem)", lineHeight: 1.35 } as const;
  const compactCardStyle = { padding: "8px 10px", gap: 6 } as const;
  const compactTitleStyle = { margin: 0, fontSize: "var(--fs-fixed-1-14rem)", lineHeight: 1.22 } as const;
  const compactButtonStyle = { padding: "4px 10px", minHeight: 28, fontSize: "var(--fs-fixed-0-84rem)", lineHeight: 1.1 } as const;
  const warningStackStyle = { display: "grid", gap: 10, padding: "2px 2px 6px" } as const;
  const resolvedSectionStyle = {
    borderTop: "1px solid var(--border)",
    paddingTop: 12,
    marginTop: 8,
    paddingBottom: 8,
    display: "grid",
    gap: 10,
  } as const;
  const paginationStyle = {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  } as const;
  const paginationCountStyle = {
    color: "var(--muted)",
    fontSize: "var(--fs-caption)",
    minWidth: 68,
    textAlign: "center",
  } as const;

  useEffect(() => {
    if (activePage > activePageCount) setActivePage(activePageCount);
  }, [activePage, activePageCount]);

  useEffect(() => {
    if (resolvedPage > resolvedPageCount) setResolvedPage(resolvedPageCount);
  }, [resolvedPage, resolvedPageCount]);

  const handleResolve = async (warningId: number) => {
    setResolvingWarningId(warningId);
    setPanelError(null);
    setPanelMessage(null);
    try {
      await resolveStaffTeamWarning(userId, projectId, teamId, warningId);
      const resolvedAt = new Date().toISOString();
      setWarnings((prev) =>
        prev.map((warning) =>
          warning.id === warningId
            ? {
                ...warning,
                active: false,
                resolvedAt,
                updatedAt: resolvedAt,
              }
            : warning,
        ),
      );
      setPanelMessage("Warning resolved.");
      router.refresh();
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : "Failed to resolve warning.");
    } finally {
      setResolvingWarningId(null);
    }
  };

  return (
    <section className="staff-projects__team-list" aria-label="Active warnings">
      <details
        className="staff-projects__team-card staff-projects__team-card--signal staff-projects__collapsible"
        style={compactPanelStyle}
      >
        <summary className="staff-projects__collapsible-summary">
          <div>
            <h3 className="staff-projects__team-title" style={compactTitleStyle}>Warnings</h3>
            <p className="staff-projects__team-count" style={{ margin: 0 }}>
              {activeWarnings.length} active warning{activeWarnings.length === 1 ? "" : "s"}. Click to review.
            </p>
          </div>
        </summary>

        {activeWarnings.length === 0 ? (
          <p className="staff-projects__team-count" style={{ margin: 0 }}>
            No active warnings.
          </p>
        ) : (
          <div style={warningStackStyle}>
            {pagedActiveWarnings.map((warning) => (
              <article key={warning.id} className="staff-projects__team-card" style={compactCardStyle}>
                <div className="staff-projects__team-top">
                  <h3 className="staff-projects__team-title" style={compactTitleStyle}>{warning.title}</h3>
                  <span className={`staff-projects__signal-status staff-projects__signal-status--${warning.severity.toLowerCase()}`}>
                    {warning.severity}
                  </span>
                </div>
                <p className="staff-projects__team-count" style={{ margin: 0 }}>{warning.details}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <p className="muted" style={{ margin: 0 }}>
                    Triggered on {formatDateTime(warning.createdAt)}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    style={compactButtonStyle}
                    onClick={() => void handleResolve(warning.id)}
                    disabled={resolvingWarningId !== null}
                  >
                    {resolvingWarningId === warning.id ? "Resolving..." : "Resolve"}
                  </Button>
                </div>
              </article>
            ))}
            {activePageCount > 1 ? (
              <div style={paginationStyle}>
                <Button type="button" variant="ghost" size="sm" style={compactButtonStyle} onClick={() => setActivePage((page) => Math.max(1, page - 1))} disabled={activePage === 1}>
                  Previous
                </Button>
                <span style={paginationCountStyle}>
                  Page {activePage} / {activePageCount}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  style={compactButtonStyle}
                  onClick={() => setActivePage((page) => Math.min(activePageCount, page + 1))}
                  disabled={activePage === activePageCount}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        )}

        <div style={resolvedSectionStyle}>
          <h4 className="staff-projects__signal-section-title" style={{ ...compactTitleStyle, marginBottom: 2 }}>Resolved history</h4>
          {resolvedWarnings.length === 0 ? (
            <p className="staff-projects__team-count" style={{ margin: 0 }}>
              No resolved warnings yet.
            </p>
          ) : (
            <div style={warningStackStyle}>
              {pagedResolvedWarnings.map((warning) => (
                <article key={`resolved-${warning.id}`} className="staff-projects__team-card staff-projects__team-card--resolved" style={compactCardStyle}>
                  <div className="staff-projects__team-top">
                    <h3 className="staff-projects__team-title" style={compactTitleStyle}>{warning.title}</h3>
                    <span className={`staff-projects__signal-status staff-projects__signal-status--${warning.severity.toLowerCase()}`}>
                      {warning.severity}
                    </span>
                  </div>
                  <p className="staff-projects__team-count" style={{ margin: 0 }}>{warning.details}</p>
                  <p className="muted" style={{ margin: 0 }}>
                    Resolved on {formatDateTime(warning.resolvedAt ?? warning.updatedAt)}
                  </p>
                </article>
              ))}
              {resolvedPageCount > 1 ? (
                <div style={paginationStyle}>
                  <Button type="button" variant="ghost" size="sm" style={compactButtonStyle} onClick={() => setResolvedPage((page) => Math.max(1, page - 1))} disabled={resolvedPage === 1}>
                    Previous
                  </Button>
                  <span style={paginationCountStyle}>
                    Page {resolvedPage} / {resolvedPageCount}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    style={compactButtonStyle}
                    onClick={() => setResolvedPage((page) => Math.min(resolvedPageCount, page + 1))}
                    disabled={resolvedPage === resolvedPageCount}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {panelMessage ? <p className="muted" style={{ margin: 0 }}>{panelMessage}</p> : null}
        {panelError ? <p className="error" style={{ margin: 0 }}>{panelError}</p> : null}
      </details>
    </section>
  );
}
