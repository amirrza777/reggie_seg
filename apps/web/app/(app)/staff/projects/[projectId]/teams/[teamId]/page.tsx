import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffTeamHealthMessages } from "@/features/projects/api/client";
import { listTeamMeetings } from "@/features/staff/meetings/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";

type StaffProjectTeamTabsPageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

function getInitials(firstName: string, lastName: string) {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}

export default async function StaffProjectTeamTabsPage({ params }: StaffProjectTeamTabsPageProps) {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { projectId, teamId } = await params;
  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);
  if (Number.isNaN(numericProjectId) || Number.isNaN(numericTeamId)) {
    return <p className="muted">Invalid project or team ID.</p>;
  }

  let data: Awaited<ReturnType<typeof getStaffProjectTeams>> | null = null;
  let errorMessage: string | null = null;
  try {
    data = await getStaffProjectTeams(user.id, numericProjectId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load team data.";
  }

  const team = data?.teams.find((item) => item.id === numericTeamId);

  if (!data || !team) {
    return (
      <div className="stack">
        <p className="muted">{errorMessage ?? "Team not found in this project."}</p>
      </div>
    );
  }

  let openSupportRequestCount: number | null = null;
  let recordedMeetingCount: number | null = null;
  let lastMeetingLabel: string | null = null;

  const [supportRequestsResult, meetingsResult] = await Promise.allSettled([
    getStaffTeamHealthMessages(user.id, numericProjectId, numericTeamId),
    listTeamMeetings(numericTeamId),
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
      <section className="staff-projects__grid" aria-label="Team health summary">
        <Link
          href={`/staff/projects/${projectId}/teams/${teamId}/team`}
          className="staff-projects__card"
          aria-label="Team health"
        >
          <h3 className="staff-projects__card-title">Team health</h3>
          <p className="staff-projects__card-sub">
            {openSupportRequestCount == null
              ? "Review risk indicators and support requests in the team health view."
              : `${openSupportRequestCount} open support request${openSupportRequestCount === 1 ? "" : "s"}.`}
          </p>
          <p className="staff-projects__card-sub">
            {recordedMeetingCount == null
              ? "Meeting activity signals are available in the team health view."
              : `${recordedMeetingCount} meeting${recordedMeetingCount === 1 ? "" : "s"} recorded${
                  lastMeetingLabel ? ` · Last meeting ${lastMeetingLabel}` : ""
                }.`}
          </p>
        </Link>
      </section>

      <section className="staff-projects__team-card" aria-label="Team members">
        <h3 style={{ margin: 0 }}>Team members</h3>
        <p className="muted" style={{ margin: 0 }}>
          Use the tabs above to open peer assessment, peer feedback, repositories, meetings, and trello.
        </p>
        {team.allocations.length === 0 ? <p className="muted" style={{ margin: 0 }}>No students assigned yet.</p> : null}
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
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
