import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { StaffTeamSectionNav } from "@/features/staff/projects/components/StaffTeamSectionNav";
import type { User } from "@/features/projects/types";

type StaffProjectTeamTabsPageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

function getInitials(firstName: string, lastName: string) {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}

type PeerProgress = { submitted: number; expected: number };

function StaffTeamMemberPills({
  user,
  peer,
}: {
  user: User;
  peer: PeerProgress | null;
}) {
  const githubOk = Boolean(user.githubAccount);
  const trelloOk = Boolean(user.trelloMemberId?.trim());

  let peerLabel: string;
  let peerTone: "ok" | "warn" | "muted";
  if (peer === null) {
    peerLabel = "Peer reviews: —";
    peerTone = "muted";
  } else if (peer.expected <= 0) {
    peerLabel = "Peer reviews: N/A";
    peerTone = "muted";
  } else {
    peerLabel = `Peer reviews: ${peer.submitted}/${peer.expected}`;
    peerTone = peer.submitted >= peer.expected ? "ok" : "warn";
  }

  const peerClass =
    peerTone === "ok"
      ? "staff-projects__gh-pill--ok"
      : peerTone === "warn"
        ? "staff-projects__gh-pill--warn"
        : "staff-projects__gh-pill--neutral";

  return (
    <div className="staff-projects__gh-health staff-projects__member-pills" aria-label="Integrations and peer reviews">
      <span className={`staff-projects__gh-pill ${githubOk ? "staff-projects__gh-pill--ok" : "staff-projects__gh-pill--warn"}`}>
        {githubOk ? "✓ GitHub" : "⚠ GitHub"}
      </span>
      <span className={`staff-projects__gh-pill ${trelloOk ? "staff-projects__gh-pill--ok" : "staff-projects__gh-pill--warn"}`}>
        {trelloOk ? "✓ Trello" : "⚠ Trello"}
      </span>
      <span className={`staff-projects__gh-pill ${peerClass}`}>{peerLabel}</span>
    </div>
  );
}

export default async function StaffProjectTeamTabsPage({ params }: StaffProjectTeamTabsPageProps) {
  const { projectId, teamId } = await params;
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) return null;

  const { user, project, team } = ctx;

  const peerByUserId = new Map<number, PeerProgress>();
  let peerProgressLoaded = false;
  try {
    const teamDetails = await getTeamDetails(user.id, project.moduleId, team.id);
    peerProgressLoaded = true;
    for (const row of teamDetails.students) {
      if (row.id != null) {
        peerByUserId.set(row.id, { submitted: row.submitted, expected: row.expected });
      }
    }
  } catch {
    peerProgressLoaded = false;
  }

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Team</p>
        <h1 className="staff-projects__title">{team.teamName}</h1>
        <p className="staff-projects__desc">Project: {project.name}</p>
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">{team.allocations.length} member{team.allocations.length === 1 ? "" : "s"}</span>
          <span className="staff-projects__badge">
            Profile: {team.deadlineProfile === "MCF" ? "MCF" : "Standard"}
          </span>
          <span className="staff-projects__badge">
            {team.hasDeadlineOverride ? "Team override active" : "No team override"}
          </span>
        </div>
      </section>

      <StaffTeamSectionNav projectId={projectId} teamId={teamId} />

      <section className="staff-projects__team-card" aria-label="Team members">
        <h3 style={{ margin: 0 }}>Team members</h3>
        <p className="muted" style={{ margin: 0 }}>
          Now that the project has started, these team members are fixed.
        </p>
        {team.allocations.length === 0 ? (
          <p className="muted">
            No students assigned yet.
          </p>
        ) : null}
        <div className="staff-projects__members">
          {team.allocations.map((allocation) => (
            <div key={allocation.userId} className="staff-projects__member">
              <div className="staff-projects__avatar">
                {getInitials(allocation.user.firstName, allocation.user.lastName)}
              </div>
              <div className="staff-projects__member-core">
                <div className="staff-projects__member-identity">
                  <p className="staff-projects__member-name">
                    {allocation.user.firstName} {allocation.user.lastName}
                  </p>
                  <p className="staff-projects__member-email">{allocation.user.email}</p>
                </div>
                <StaffTeamMemberPills
                  user={allocation.user}
                  peer={
                    !peerProgressLoaded
                      ? null
                      : (peerByUserId.get(allocation.userId) ?? {
                          submitted: 0,
                          expected: Math.max(0, team.allocations.length - 1),
                        })
                  }
                />
              </div>
              <button
                type="button"
                className="staff-projects__member-placeholder-btn"
                disabled
                title="Notification workflow placeholder"
              >
                Notify student
              </button>
            </div>
        ))}
        </div>
      </section>
    </div>
  );
}
