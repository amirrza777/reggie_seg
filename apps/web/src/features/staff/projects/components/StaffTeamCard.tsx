"use client";

import { useState } from "react";
import Link from "next/link";
import type { Team } from "@/features/projects/types";
import { dismissTeamFlag } from "@/features/projects/api/client";

type Props = {
  team: Team;
  projectId: number;
};

function getInitials(firstName: string, lastName: string) {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}

export function StaffTeamCard({ team, projectId }: Props) {
  const [flag, setFlag] = useState(team.inactivityFlag);
  const [dismissing, setDismissing] = useState(false);

  async function handleDismiss() {
    setDismissing(true);
    try {
      await dismissTeamFlag(team.id);
      setFlag("NONE");
    } finally {
      setDismissing(false);
    }
  }

  return (
    <article className="staff-projects__team-card">
      <div className="staff-projects__team-top">
        <h3 className="staff-projects__team-title">{team.teamName}</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="staff-projects__badge">
            {team.allocations.length} member{team.allocations.length === 1 ? "" : "s"}
          </span>
          {flag === "YELLOW" && (
            <span className="team-flag team-flag--yellow">⚠ Inactive 7+ days</span>
          )}
          {flag === "RED" && (
            <span className="team-flag team-flag--red">🚩 Inactive 14+ days</span>
          )}
        </div>
      </div>

      {team.allocations.length > 0 ? (
        <div className="staff-projects__team-avatars" aria-label={`Member preview for ${team.teamName}`}>
          {team.allocations.slice(0, 5).map((allocation) => (
            <span key={allocation.userId} className="staff-projects__avatar staff-projects__avatar--sm">
              {getInitials(allocation.user.firstName, allocation.user.lastName)}
            </span>
          ))}
          {team.allocations.length > 5 ? (
            <span className="staff-projects__member-email">+{team.allocations.length - 5} more</span>
          ) : null}
        </div>
      ) : (
        <p className="staff-projects__team-count">No students assigned yet.</p>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
        <Link href={`/staff/projects/${projectId}/teams/${team.id}`} className="pill-nav__link staff-projects__team-action">
          Open team workspace
        </Link>
        {flag === "RED" && (
          <button
            type="button"
            className="team-flag__dismiss"
            disabled={dismissing}
            onClick={handleDismiss}
          >
            {dismissing ? "Dismissing…" : "Dismiss flag"}
          </button>
        )}
      </div>
    </article>
  );
}
