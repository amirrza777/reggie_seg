import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";

type StaffProjectTeamTabsPageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

function getInitials(firstName: string, lastName: string) {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}

export default async function StaffProjectTeamTabsPage({ params }: StaffProjectTeamTabsPageProps) {
  const { projectId, teamId } = await params;
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) return null;

  const { team } = ctx;

  return (
    <>
      <section className="staff-projects__grid" aria-label="Team overview quick actions">
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">Team health</h3>
          <p className="staff-projects__card-sub">
            Placeholder for flagged-risk indicators and team-health metrics.
          </p>
          <Link
            href={`/staff/projects/${projectId}/teams/${teamId}/teamhealth`}
            className="staff-projects__card-action"
          >
            View team health
          </Link>
        </article>
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">Schedule meeting with team</h3>
          <p className="staff-projects__card-sub">
            Placeholder for meeting scheduling workflow and notifications.
          </p>
          <button type="button" className="staff-projects__card-placeholder-btn" disabled>
            Schedule meeting
          </button>
        </article>
      </section>

      <section className="staff-projects__team-card" aria-label="Team members">
        <h3 style={{ margin: 0 }}>Team members</h3>
        <p className="muted" style={{ margin: 0 }}>
          Use the tabs above to open peer assessment, peer feedback, repositories, meetings, and trello.
        </p>
        {team.allocations.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No students assigned yet.</p>
        ) : null}
        <div className="staff-projects__members">
          {team.allocations.map((allocation) => (
            <div key={allocation.userId} className="staff-projects__member">
              <div className="staff-projects__avatar">
                {getInitials(allocation.user.firstName, allocation.user.lastName)}
              </div>
              <div>
                <p className="staff-projects__member-name">
                  {allocation.user.firstName} {allocation.user.lastName}
                </p>
                <p className="staff-projects__member-email">{allocation.user.email}</p>
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
    </>
  );
}
