import Link from "next/link";
import { getStaffTeamHealthMessages } from "@/features/projects/api/client";
import { listTeamMeetings } from "@/features/staff/meetings/api/client";
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

  const { user, project, team } = ctx;

  let openSupportRequestCount: number | null = null;
  let recordedMeetingCount: number | null = null;
  let lastMeetingLabel: string | null = null;

  const [supportRequestsResult, meetingsResult] = await Promise.allSettled([
    getStaffTeamHealthMessages(user.id, project.id, team.id),
    listTeamMeetings(team.id),
  ]);

  if (supportRequestsResult.status === "fulfilled") {
    openSupportRequestCount = supportRequestsResult.value.filter((request) => !request.resolved).length;
  }

  if (meetingsResult.status === "fulfilled") {
    recordedMeetingCount = meetingsResult.value.length;

    const latestMeetingTimestamp = meetingsResult.value.reduce<number | null>((latest, meeting) => {
      const timestamp = new Date(meeting.date).getTime();
      if (!Number.isFinite(timestamp)) return latest;
      if (latest == null || timestamp > latest) return timestamp;
      return latest;
    }, null);

    if (latestMeetingTimestamp != null) {
      lastMeetingLabel = new Date(latestMeetingTimestamp).toLocaleDateString();
    }
  }

  return (
    <>
      <section className="staff-projects__grid" aria-label="Team overview quick actions">
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">Team health</h3>
          <p className="staff-projects__card-sub">
            {openSupportRequestCount == null
              ? "Open team health to review risk indicators and support requests."
              : `${openSupportRequestCount} open support request${openSupportRequestCount === 1 ? "" : "s"}.`}
          </p>
          <p className="staff-projects__card-sub">
            {recordedMeetingCount == null
              ? "Meeting activity signals are available in the team health view."
              : `${recordedMeetingCount} meeting${recordedMeetingCount === 1 ? "" : "s"} recorded${
                  lastMeetingLabel ? ` · Last meeting ${lastMeetingLabel}` : ""
                }.`}
          </p>
          <Link
            href={`/staff/projects/${projectId}/teams/${teamId}/team`}
            className="staff-projects__card-action"
          >
            Open team health
          </Link>
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
