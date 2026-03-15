import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams, getStaffTeamHealthMessages } from "@/features/projects/api/client";
import { StaffTeamSectionNav } from "@/features/staff/projects/components/StaffTeamSectionNav";
import { StaffTeamHealthMessageReviewPanel } from "@/features/staff/projects/components/StaffTeamHealthMessageReviewPanel";
import { listMeetings } from "@/features/meetings/api/client";
import { getLatestProjectGithubSnapshot, listProjectGithubRepoLinks } from "@/features/github/api/client";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import "@/features/staff/projects/styles/staff-projects.css";
import type { TeamHealthMessage } from "@/features/projects/types";
import type { GithubLatestSnapshot } from "@/features/github/types";
import type { Meeting } from "@/features/meetings/types";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

type MeetingHealthSummary = {
  total: number;
  upcoming: number;
  recentThirtyDays: number;
  withMinutes: number;
  attendanceRate: number | null;
  lastMeetingAt: string | null;
};

type RepoHealthSummary = {
  linkedRepos: number;
  analysedRepos: number;
  commitsLast14Days: number | null;
  activeCommitDaysLast14Days: number | null;
  latestAnalysedAt: string | null;
};

type PeerAssessmentHealthSummary = {
  students: number;
  submitted: number;
  expected: number;
  completionRate: number | null;
  missingStudents: number;
};

function buildMeetingHealthSummary(meetings: Meeting[]): MeetingHealthSummary {
  const now = Date.now();
  const cutoffThirtyDays = now - 30 * 24 * 60 * 60 * 1000;
  const presentStatuses = new Set(["on_time", "late", "present"]);

  let upcoming = 0;
  let recentThirtyDays = 0;
  let withMinutes = 0;
  let attendanceMarked = 0;
  let attendancePresent = 0;
  let lastMeetingTimestamp = 0;

  for (const meeting of meetings) {
    const meetingTimestamp = new Date(meeting.date).getTime();
    if (!Number.isNaN(meetingTimestamp)) {
      if (meetingTimestamp > now) upcoming += 1;
      if (meetingTimestamp <= now && meetingTimestamp >= cutoffThirtyDays) recentThirtyDays += 1;
      if (meetingTimestamp > lastMeetingTimestamp) lastMeetingTimestamp = meetingTimestamp;
    }

    if (meeting.minutes?.content?.trim()) withMinutes += 1;

    for (const attendance of meeting.attendances) {
      attendanceMarked += 1;
      if (presentStatuses.has(attendance.status.trim().toLowerCase())) {
        attendancePresent += 1;
      }
    }
  }

  return {
    total: meetings.length,
    upcoming,
    recentThirtyDays,
    withMinutes,
    attendanceRate: attendanceMarked > 0 ? Math.round((attendancePresent / attendanceMarked) * 100) : null,
    lastMeetingAt: lastMeetingTimestamp > 0 ? new Date(lastMeetingTimestamp).toISOString() : null,
  };
}

function addCommitsByDay(target: Map<string, number>, source: Record<string, number> | null | undefined) {
  if (!source) return;
  for (const [day, rawValue] of Object.entries(source)) {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) continue;
    target.set(day, (target.get(day) ?? 0) + value);
  }
}

function getTeamCommitsByDay(
  snapshot: GithubLatestSnapshot["snapshot"],
  teamUserIds: Set<number>
): Record<string, number> | null {
  const merged = new Map<string, number>();
  let hasData = false;

  for (const stat of snapshot.userStats) {
    if (stat.mappedUserId == null || !teamUserIds.has(stat.mappedUserId)) continue;
    if (!stat.commitsByDay) continue;
    hasData = true;
    addCommitsByDay(merged, stat.commitsByDay);
  }

  if (!hasData) return null;
  return Object.fromEntries(merged);
}

function countCommitsForLastDays(commitsByDay: Map<string, number>, days: number) {
  const now = Date.now();
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  let total = 0;
  let activeDays = 0;

  for (const [day, commits] of commitsByDay.entries()) {
    const timestamp = new Date(`${day}T00:00:00.000Z`).getTime();
    if (Number.isNaN(timestamp) || timestamp < cutoff) continue;
    total += commits;
    if (commits > 0) activeDays += 1;
  }

  return { total, activeDays };
}

async function loadRepoHealthSummary(projectId: number, teamUserIds: number[]): Promise<RepoHealthSummary> {
  const links = await listProjectGithubRepoLinks(projectId);
  if (links.length === 0) {
    return {
      linkedRepos: 0,
      analysedRepos: 0,
      commitsLast14Days: null,
      activeCommitDaysLast14Days: null,
      latestAnalysedAt: null,
    };
  }

  const snapshots = await Promise.all(
    links.map(async (link) => {
      try {
        const latest = await getLatestProjectGithubSnapshot(link.id);
        return latest.snapshot;
      } catch {
        return null;
      }
    })
  );

  const teamIdSet = new Set(teamUserIds);
  const aggregateByDay = new Map<string, number>();
  let analysedRepos = 0;
  let latestAnalysedAt: string | null = null;

  for (const snapshot of snapshots) {
    if (!snapshot) continue;
    analysedRepos += 1;
    if (!latestAnalysedAt || snapshot.analysedAt > latestAnalysedAt) {
      latestAnalysedAt = snapshot.analysedAt;
    }

    const teamCommits = getTeamCommitsByDay(snapshot, teamIdSet);
    const fallbackRepoCommits = snapshot.repoStats[0]?.commitsByDay ?? null;
    addCommitsByDay(aggregateByDay, teamCommits ?? fallbackRepoCommits);
  }

  if (aggregateByDay.size === 0) {
    return {
      linkedRepos: links.length,
      analysedRepos,
      commitsLast14Days: null,
      activeCommitDaysLast14Days: null,
      latestAnalysedAt,
    };
  }

  const recent = countCommitsForLastDays(aggregateByDay, 14);
  return {
    linkedRepos: links.length,
    analysedRepos,
    commitsLast14Days: recent.total,
    activeCommitDaysLast14Days: recent.activeDays,
    latestAnalysedAt,
  };
}

function buildPeerAssessmentHealthSummary(
  students: Awaited<ReturnType<typeof getTeamDetails>>["students"]
): PeerAssessmentHealthSummary {
  const expected = students.reduce((sum, student) => sum + Math.max(0, Number(student.expected) || 0), 0);
  const submitted = students.reduce((sum, student) => sum + Math.max(0, Number(student.submitted) || 0), 0);
  const missingStudents = students.filter((student) => (Number(student.expected) || 0) > 0 && (Number(student.submitted) || 0) === 0).length;

  return {
    students: students.length,
    submitted,
    expected,
    completionRate: expected > 0 ? Math.round((submitted / expected) * 100) : null,
    missingStudents,
  };
}

function formatDateTime(value: string | null) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";
  return parsed.toLocaleString();
}

function buildHealthFlags(input: {
  teamSize: number;
  repo: RepoHealthSummary | null;
  meetings: MeetingHealthSummary | null;
  peer: PeerAssessmentHealthSummary | null;
  requests: TeamHealthMessage[];
}) {
  const flags: string[] = [];

  if (input.repo?.commitsLast14Days != null) {
    const commitTargetFloor = Math.max(2, input.teamSize);
    if (input.repo.commitsLast14Days < commitTargetFloor) {
      flags.push("Low commit activity in the last 14 days.");
    }
  }

  if (input.meetings) {
    if (input.meetings.recentThirtyDays === 0) {
      flags.push("No team meetings in the last 30 days.");
    }
    if (input.meetings.attendanceRate != null && input.meetings.attendanceRate < 70) {
      flags.push("Meeting attendance trend is below 70%.");
    }
  }

  if (input.peer?.completionRate != null && input.peer.completionRate < 80) {
    flags.push("Peer assessment completion is below 80%.");
  }

  const openSupportRequests = input.requests.filter((request) => !request.resolved).length;
  if (openSupportRequests > 0) {
    flags.push(`${openSupportRequests} open support request${openSupportRequests === 1 ? "" : "s"} awaiting action.`);
  }

  return flags;
}

export default async function StaffTeamHealthPage({ params }: PageProps) {
  const { projectId, teamId } = await params;
  const user = await getCurrentUser();

  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);
  if (Number.isNaN(numericProjectId) || Number.isNaN(numericTeamId)) {
    return <p className="muted">Invalid project or team ID.</p>;
  }

  let projectData: Awaited<ReturnType<typeof getStaffProjectTeams>> | null = null;
  let projectError: string | null = null;
  try {
    projectData = await getStaffProjectTeams(user.id, numericProjectId);
  } catch (error) {
    projectError = error instanceof Error ? error.message : "Failed to load project team data.";
  }

  const team = projectData?.teams.find((item) => item.id === numericTeamId) ?? null;
  if (!projectData || !team) {
    return (
      <div className="stack">
        <p className="muted">{projectError ?? "Team not found in this project."}</p>
        <Link href={`/staff/projects/${projectId}`} className="pill-nav__link" style={{ width: "fit-content" }}>
          Back to project teams
        </Link>
      </div>
    );
  }

  const [requestsResult, meetingsResult, repoHealthResult, peerAssessmentResult] = await Promise.allSettled([
    getStaffTeamHealthMessages(user.id, numericProjectId, numericTeamId),
    listMeetings(numericTeamId),
    loadRepoHealthSummary(numericProjectId, team.allocations.map((allocation) => allocation.userId)),
    getTeamDetails(user.id, projectData.project.moduleId, numericTeamId),
  ]);

  const requests: TeamHealthMessage[] = requestsResult.status === "fulfilled" ? requestsResult.value : [];
  const requestsError =
    requestsResult.status === "rejected"
      ? requestsResult.reason instanceof Error
        ? requestsResult.reason.message
        : "Failed to load support requests."
      : null;

  const meetingSummary =
    meetingsResult.status === "fulfilled" ? buildMeetingHealthSummary(meetingsResult.value) : null;
  const meetingsError =
    meetingsResult.status === "rejected"
      ? meetingsResult.reason instanceof Error
        ? meetingsResult.reason.message
        : "Failed to load meeting signals."
      : null;

  const repoSummary = repoHealthResult.status === "fulfilled" ? repoHealthResult.value : null;
  const repoError =
    repoHealthResult.status === "rejected"
      ? repoHealthResult.reason instanceof Error
        ? repoHealthResult.reason.message
        : "Failed to load repository signals."
      : null;

  const peerSummary =
    peerAssessmentResult.status === "fulfilled"
      ? buildPeerAssessmentHealthSummary(peerAssessmentResult.value.students)
      : null;
  const peerError =
    peerAssessmentResult.status === "rejected"
      ? peerAssessmentResult.reason instanceof Error
        ? peerAssessmentResult.reason.message
        : "Failed to load peer-assessment signals."
      : null;

  const healthFlags = buildHealthFlags({
    teamSize: team.allocations.length,
    repo: repoSummary,
    meetings: meetingSummary,
    peer: peerSummary,
    requests,
  });
  const healthLabel = healthFlags.length === 0 ? "Healthy" : healthFlags.length <= 2 ? "Watch" : "At Risk";
  const summaryMetrics = [
    {
      label: "Commits (14d)",
      value: repoSummary?.commitsLast14Days != null ? String(repoSummary.commitsLast14Days) : "Not available",
      isAvailable: repoSummary?.commitsLast14Days != null,
    },
    {
      label: "Active coding days (14d)",
      value: repoSummary?.activeCommitDaysLast14Days != null ? String(repoSummary.activeCommitDaysLast14Days) : "Not available",
      isAvailable: repoSummary?.activeCommitDaysLast14Days != null,
    },
    {
      label: "Meetings (last 30d)",
      value: meetingSummary ? String(meetingSummary.recentThirtyDays) : "Not available",
      isAvailable: Boolean(meetingSummary),
    },
    {
      label: "Attendance rate",
      value: meetingSummary?.attendanceRate != null ? `${meetingSummary.attendanceRate}%` : "Not available",
      isAvailable: meetingSummary?.attendanceRate != null,
    },
    {
      label: "Peer assessment completion",
      value: peerSummary?.completionRate != null ? `${peerSummary.completionRate}%` : "Not available",
      isAvailable: peerSummary?.completionRate != null,
    },
    {
      label: "Open support requests",
      value: String(requests.filter((request) => !request.resolved).length),
      isAvailable: true,
    },
  ] as const;

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Team Health</p>
        <h1 className="staff-projects__title">{team.teamName}</h1>
        <p className="staff-projects__desc">
          Project: {projectData.project.name}. Monitor activity signals across repositories, meetings, assessment progress,
          and support requests.
        </p>
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">Project {projectData.project.id}</span>
          <span className="staff-projects__badge">Team {team.id}</span>
          <span className="staff-projects__badge">Health: {healthLabel}</span>
          <Link href={`/staff/projects/${projectData.project.id}/teams/${team.id}`} className="staff-projects__badge">
            Back to team overview
          </Link>
        </div>
      </section>

      <StaffTeamSectionNav projectId={projectId} teamId={teamId} />

      <section className="staff-projects__grid staff-projects__health-metrics" aria-label="Team health summary">
        {summaryMetrics.map((metric) => (
          <article key={metric.label} className="staff-projects__card staff-projects__health-metric-card">
            <p className="staff-projects__health-metric-label">{metric.label}</p>
            <p
              className={`staff-projects__health-metric-value${
                metric.isAvailable ? "" : " staff-projects__health-metric-value--muted"
              }`}
            >
              {metric.value}
            </p>
          </article>
        ))}
      </section>

      <section className="staff-projects__team-list" aria-label="Team health signals">
        <article className="staff-projects__team-card staff-projects__team-card--signal">
          <div className="staff-projects__team-top">
            <div>
              <h3 className="staff-projects__team-title">Signal overview</h3>
              <p className="staff-projects__team-count">
                A consolidated read of activity, meetings, assessments, and support signals.
              </p>
            </div>
            <span className="staff-projects__badge">{healthLabel}</span>
          </div>
          {healthFlags.length === 0 ? (
            <p className="staff-projects__team-count">
              No immediate risk signals found from commits, meetings, peer assessment completion, and support requests.
            </p>
          ) : (
            <ul className="staff-projects__signal-flags">
              {healthFlags.map((flag) => (
                <li key={flag} className="staff-projects__team-count">{flag}</li>
              ))}
            </ul>
          )}
          <dl className="staff-projects__signal-stats">
            <div className="staff-projects__signal-stat">
              <dt>Latest meeting</dt>
              <dd>{formatDateTime(meetingSummary?.lastMeetingAt ?? null)}</dd>
            </div>
            <div className="staff-projects__signal-stat">
              <dt>Meetings with minutes</dt>
              <dd>{meetingSummary?.withMinutes ?? "Not available"}</dd>
            </div>
            <div className="staff-projects__signal-stat">
              <dt>Repositories analysed</dt>
              <dd>{repoSummary ? `${repoSummary.analysedRepos}/${repoSummary.linkedRepos}` : "Not available"}</dd>
            </div>
            <div className="staff-projects__signal-stat">
              <dt>Latest repo snapshot</dt>
              <dd>{formatDateTime(repoSummary?.latestAnalysedAt ?? null)}</dd>
            </div>
            <div className="staff-projects__signal-stat">
              <dt>Peer assessments submitted</dt>
              <dd>{peerSummary ? `${peerSummary.submitted}/${peerSummary.expected}` : "Not available"}</dd>
            </div>
            <div className="staff-projects__signal-stat">
              <dt>Students with zero submissions</dt>
              <dd>{peerSummary?.missingStudents ?? "Not available"}</dd>
            </div>
          </dl>
          {repoError ? <p className="muted" style={{ margin: 0 }}>Repository signal error: {repoError}</p> : null}
          {meetingsError ? <p className="muted" style={{ margin: 0 }}>Meeting signal error: {meetingsError}</p> : null}
          {peerError ? <p className="muted" style={{ margin: 0 }}>Peer signal error: {peerError}</p> : null}
        </article>
      </section>

      <StaffTeamHealthMessageReviewPanel
        userId={user.id}
        projectId={numericProjectId}
        teamId={numericTeamId}
        initialRequests={requests}
        initialError={requestsError}
      />
    </div>
  );
}
