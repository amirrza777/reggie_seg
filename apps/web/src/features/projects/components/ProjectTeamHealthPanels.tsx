"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { TeamHealthMessagePanel } from "./TeamHealthMessagePanel";
import type { TeamHealthMessage, TeamWarning } from "../types";

type TeamHealthTab = "warnings" | "messages";

type ProjectTeamHealthPanelsProps = {
  projectId: number;
  userId: number;
  initialRequests: TeamHealthMessage[];
  activeWarnings: TeamWarning[];
  messagesLoadError: string | null;
  warningsLoadError: string | null;
};

function warningBackgroundBySeverity(severity: TeamWarning["severity"]) {
  if (severity === "HIGH") {
    return "color-mix(in srgb, var(--status-danger-text) 12%, var(--surface))";
  }
  if (severity === "MEDIUM") {
    return "color-mix(in srgb, var(--status-warning-text) 12%, var(--surface))";
  }
  return "color-mix(in srgb, var(--status-success-text) 12%, var(--surface))";
}

export function ProjectTeamHealthPanels({
  projectId,
  userId,
  initialRequests,
  activeWarnings,
  messagesLoadError,
  warningsLoadError,
}: ProjectTeamHealthPanelsProps) {
  const { canEdit: workspaceCanEdit } = useProjectWorkspaceCanEdit();
  const [tab, setTab] = useState<TeamHealthTab>("messages");
  const [warningPage, setWarningPage] = useState(1);
  const warningPageSize = 5;

  const warningCountLabel = useMemo(
    () => `Warnings${activeWarnings.length > 0 ? ` (${activeWarnings.length})` : ""}`,
    [activeWarnings.length],
  );
  const warningPageCount = Math.max(1, Math.ceil(activeWarnings.length / warningPageSize));
  const pagedWarnings = useMemo(() => {
    const start = (warningPage - 1) * warningPageSize;
    return activeWarnings.slice(start, start + warningPageSize);
  }, [activeWarnings, warningPage]);
  useEffect(() => {
    if (warningPage > warningPageCount) setWarningPage(warningPageCount);
  }, [warningPage, warningPageCount]);

  return (
    <div className="stack" style={{ gap: 16 }}>
      <nav className="pill-nav" aria-label="Team health panels">
        <button
          type="button"
          className={`pill-nav__link${tab === "messages" ? " pill-nav__link--active" : ""}`}
          onClick={() => setTab("messages")}
        >
          Messages
        </button>
        <button
          type="button"
          className={`pill-nav__link${tab === "warnings" ? " pill-nav__link--active" : ""}`}
          onClick={() => setTab("warnings")}
        >
          {warningCountLabel}
        </button>
      </nav>

      {tab === "warnings" ? (
        <Card title="Warnings">
          <div className="stack" style={{ gap: 8, marginBottom: 16 }}>
            {activeWarnings.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No warnings for your team right now.
              </p>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {pagedWarnings.map((warning) => (
                  <article
                    key={warning.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      padding: "10px 12px",
                      background: warningBackgroundBySeverity(warning.severity),
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 700 }}>{warning.title}</p>
                    <p className="muted" style={{ margin: "4px 0 0" }}>{warning.details}</p>
                  </article>
                ))}
                {warningPageCount > 1 ? (
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setWarningPage((page) => Math.max(1, page - 1))}
                      disabled={warningPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="muted" style={{ minWidth: 68, textAlign: "center", fontSize: "var(--fs-caption)" }}>
                      Page {warningPage} / {warningPageCount}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setWarningPage((page) => Math.min(warningPageCount, page + 1))}
                      disabled={warningPage === warningPageCount}
                    >
                      Next
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
            {warningsLoadError ? <p className="error" style={{ margin: 0 }}>{warningsLoadError}</p> : null}
          </div>
        </Card>
      ) : (
        <Card title="Messages">
          <div className="stack" style={{ gap: 6, marginBottom: 12 }}>
            <p className="muted" style={{ margin: 0 }}>
              {workspaceCanEdit
                ? "Submit and track team health messages for your team."
                : "Historical team health messages for your team. New messages cannot be added while this project is archived."}
            </p>
          </div>

          <TeamHealthMessagePanel
            projectId={projectId}
            userId={userId}
            initialRequests={initialRequests}
            allowNewMessages={workspaceCanEdit}
          />
          {messagesLoadError ? <p className="error">{messagesLoadError}</p> : null}
        </Card>
      )}
    </div>
  );
}
