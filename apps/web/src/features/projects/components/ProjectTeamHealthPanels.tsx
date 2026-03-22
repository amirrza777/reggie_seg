"use client";

import { useMemo, useState } from "react";
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
  const [tab, setTab] = useState<TeamHealthTab>("messages");

  const warningCountLabel = useMemo(
    () => `Warnings${activeWarnings.length > 0 ? ` (${activeWarnings.length})` : ""}`,
    [activeWarnings.length],
  );

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
                {activeWarnings.map((warning) => (
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
              </div>
            )}
            {warningsLoadError ? <p className="error" style={{ margin: 0 }}>{warningsLoadError}</p> : null}
          </div>
        </Card>
      ) : (
        <Card title="Messages">
          <div className="stack" style={{ gap: 6, marginBottom: 12 }}>
            <p className="muted" style={{ margin: 0 }}>
              Submit and track team health messages for your team.
            </p>
          </div>

          <TeamHealthMessagePanel
            projectId={projectId}
            userId={userId}
            initialRequests={initialRequests}
          />
          {messagesLoadError ? <p className="error">{messagesLoadError}</p> : null}
        </Card>
      )}
    </div>
  );
}
