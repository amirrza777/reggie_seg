import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffTeamHealthMessages, getStaffTeamWarnings } from "@/features/projects/api/client";
import { listTeamMeetings } from "@/features/staff/meetings/api/client";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { getLatestProjectGithubSnapshot, listProjectGithubRepoLinks } from "@/features/github/api/client";
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

type TeamOverviewMetrics = {
  activeWarnings: number | null;
  assessmentCompletion: number | null;
  meetingCount: number | null;
  totalRepoCommits: number | null;
  averageAttendance: number | null;
};

const presentStatuses = new Set(["on_time", "late", "present"]);

function getAttendanceRate(meetings: Awaited<ReturnType<typeof listTeamMeetings>>): number | null {
  let marked = 0;
  let present = 0;

  for (const meeting of meetings) {
    const attendances = Array.isArray(meeting.attendances) ? meeting.attendances : [];
    for (const attendance of attendances) {
      marked += 1;
      if (presentStatuses.has(attendance.status.trim().toLowerCase())) {
        present += 1;
      }
    }
  }

  if (marked === 0) return null;
  return Math.round((present / marked) * 100);
}

function getAssessmentCompletion(students: Awaited<ReturnType<typeof getTeamDetails>>["students"]): number {
  const expected = students.reduce((sum, student) => sum + Math.max(0, Number(student.expected) || 0), 0);
  const submitted = students.reduce((sum, student) => sum + Math.max(0, Number(student.submitted) || 0), 0);
  if (expected <= 0) return 0;
  return Math.round((submitted / expected) * 100);
}

function average(values: Array<number | null>): number | null {
  const defined = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (defined.length === 0) return null;
  return Math.round(defined.reduce((sum, value) => sum + value, 0) / defined.length);
}

function formatCount(value: number | null) {
  return value == null ? "—" : value.toLocaleString();
}

function formatPercent(value: number | null) {
  return value == null ? "—" : `${value}%`;
}

async function loadProjectCommitTotalsByTeam(
  projectId: number,
  teamUserIdsByTeamId: Map<number, Set<number>>,
): Promise<Map<number, number>> {
  const totalsByTeam = new Map<number, number>();
  for (const teamId of teamUserIdsByTeamId.keys()) {
    totalsByTeam.set(teamId, 0);
  }

  const links = await listProjectGithubRepoLinks(projectId);
  if (links.length === 0) return totalsByTeam;

  const snapshots = await Promise.allSettled(
    links.map((link) => getLatestProjectGithubSnapshot(link.id))
  );

  for (const snapshotResult of snapshots) {
    if (snapshotResult.status !== "fulfilled") continue;

    for (const [teamId, userIds] of teamUserIdsByTeamId.entries()) {
      let commitsForTeamInSnapshot = 0;

      for (const stat of snapshotResult.value.snapshot.userStats) {
        if (stat.mappedUserId == null) continue;
        if (!userIds.has(stat.mappedUserId)) continue;
        const commits = Number(stat.commits);
        if (!Number.isFinite(commits)) continue;
        commitsForTeamInSnapshot += commits;
      }

      totalsByTeam.set(teamId, (totalsByTeam.get(teamId) ?? 0) + commitsForTeamInSnapshot);
    }
  }

  return totalsByTeam;
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
  let teamVsAverage: { team: TeamOverviewMetrics; average: TeamOverviewMetrics } | null = null;

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

  try {
    const teamUserIdsByTeamId = new Map(
      data.teams.map((projectTeam) => [
        projectTeam.id,
        new Set(projectTeam.allocations.map((allocation) => allocation.userId)),
      ]),
    );

    let commitTotalsByTeam = new Map<number, number>();
    try {
      commitTotalsByTeam = await loadProjectCommitTotalsByTeam(numericProjectId, teamUserIdsByTeamId);
    } catch {
      for (const projectTeam of data.teams) {
        commitTotalsByTeam.set(projectTeam.id, 0);
      }
    }

    const perTeamMetrics = await Promise.all(
      data.teams.map(async (projectTeam) => {
        const [teamWarningsResult, teamMeetingsResult, teamAssessmentResult] = await Promise.allSettled([
          getStaffTeamWarnings(user.id, numericProjectId, projectTeam.id),
          listTeamMeetings(projectTeam.id),
          getTeamDetails(user.id, data.project.moduleId, projectTeam.id),
        ]);

        const activeWarnings =
          teamWarningsResult.status === "fulfilled"
            ? teamWarningsResult.value.filter((warning) => warning.active).length
            : null;

        const meetingCount =
          teamMeetingsResult.status === "fulfilled"
            ? teamMeetingsResult.value.length
            : null;

        const averageAttendance =
          teamMeetingsResult.status === "fulfilled"
            ? getAttendanceRate(teamMeetingsResult.value)
            : null;

        const assessmentCompletion =
          teamAssessmentResult.status === "fulfilled"
            ? getAssessmentCompletion(teamAssessmentResult.value.students)
            : null;

        return [projectTeam.id, {
          activeWarnings,
          assessmentCompletion,
          meetingCount,
          totalRepoCommits: commitTotalsByTeam.get(projectTeam.id) ?? 0,
          averageAttendance,
        } satisfies TeamOverviewMetrics] as const;
      }),
    );

    const metricsByTeamId = new Map(perTeamMetrics);
    const selectedTeamMetrics = metricsByTeamId.get(numericTeamId);

    if (selectedTeamMetrics) {
      const allMetrics = [...metricsByTeamId.values()];
      teamVsAverage = {
        team: selectedTeamMetrics,
        average: {
          activeWarnings: average(allMetrics.map((metric) => metric.activeWarnings)),
          assessmentCompletion: average(allMetrics.map((metric) => metric.assessmentCompletion)),
          meetingCount: average(allMetrics.map((metric) => metric.meetingCount)),
          totalRepoCommits: average(allMetrics.map((metric) => metric.totalRepoCommits)),
          averageAttendance: average(allMetrics.map((metric) => metric.averageAttendance)),
        },
      };
    }
  } catch {
    teamVsAverage = null;
  }

  return (
    <>
      <section className="staff-projects__team-overview-top" aria-label="Team health summary">
        <Link
          href={`/staff/projects/${projectId}/teams/${teamId}/teamhealth`}
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

        {teamVsAverage ? (
          <article
            className="staff-projects__card staff-projects__card--comparison"
            aria-label="Team versus project average metrics"
          >
            <div className="staff-projects__comparison-head">
              <span>Metric</span>
              <span>Team</span>
              <span>Avg</span>
            </div>
            <div className="staff-projects__comparison-row">
              <span>Active warnings</span>
              <strong>{formatCount(teamVsAverage.team.activeWarnings)}</strong>
              <strong>{formatCount(teamVsAverage.average.activeWarnings)}</strong>
            </div>
            <div className="staff-projects__comparison-row">
              <span>Assessment completion</span>
              <strong>{formatPercent(teamVsAverage.team.assessmentCompletion)}</strong>
              <strong>{formatPercent(teamVsAverage.average.assessmentCompletion)}</strong>
            </div>
            <div className="staff-projects__comparison-row">
              <span>Meetings</span>
              <strong>{formatCount(teamVsAverage.team.meetingCount)}</strong>
              <strong>{formatCount(teamVsAverage.average.meetingCount)}</strong>
            </div>
            <div className="staff-projects__comparison-row">
              <span>Total repo commits</span>
              <strong>{formatCount(teamVsAverage.team.totalRepoCommits)}</strong>
              <strong>{formatCount(teamVsAverage.average.totalRepoCommits)}</strong>
            </div>
            <div className="staff-projects__comparison-row">
              <span>Average attendance</span>
              <strong>{formatPercent(teamVsAverage.team.averageAttendance)}</strong>
              <strong>{formatPercent(teamVsAverage.average.averageAttendance)}</strong>
            </div>
          </article>
        ) : null}
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
