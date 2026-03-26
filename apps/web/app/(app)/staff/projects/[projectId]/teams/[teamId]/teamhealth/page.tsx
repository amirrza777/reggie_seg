import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffTeamHealthMessages, getStaffTeamWarnings } from "@/features/projects/api/client";
import { StaffTeamSectionNav } from "@/features/staff/projects/components/StaffTeamSectionNav";
import { StaffTeamHealthMessageReviewPanel } from "@/features/staff/projects/components/StaffTeamHealthMessageReviewPanel";
import { StaffTeamWarningReviewPanel } from "@/features/staff/projects/components/StaffTeamWarningReviewPanel";
import { listMeetings } from "@/features/meetings/api/client";
import { getLatestProjectGithubSnapshot, listProjectGithubRepoLinks } from "@/features/github/api/client";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import "@/features/staff/projects/styles/staff-projects.css";
import type { TeamHealthMessage, TeamWarning } from "@/features/projects/types";
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

type HealthSignalStatus = "ALERT" | "OK" | "UNKNOWN";

type HealthSignal = {
  key: string;
  label: string;
  status: HealthSignalStatus;
  detail: string;
};

function buildHealthSignals(input: {
  teamSize: number;
  repo: RepoHealthSummary | null;
  meetings: MeetingHealthSummary | null;
  peer: PeerAssessmentHealthSummary | null;
  requests: TeamHealthMessage[];
}) {
  const signals: HealthSignal[] = [];

  const commitTargetFloor = Math.max(2, input.teamSize);
  if (input.repo?.commitsLast14Days == null) {
    signals.push({
      key: "LOW_COMMIT_ACTIVITY",
      label: "Commit activity (14d)",
      status: "UNKNOWN",
      detail: "No repository activity data available yet.",
    });
  } else if (input.repo.commitsLast14Days < commitTargetFloor) {
    signals.push({
      key: "LOW_COMMIT_ACTIVITY",
      label: "Commit activity (14d)",
      status: "ALERT",
      detail: `${input.repo.commitsLast14Days} commits in last 14 days (expected at least ${commitTargetFloor}).`,
    });
  } else {
    signals.push({
      key: "LOW_COMMIT_ACTIVITY",
      label: "Commit activity (14d)",
      status: "OK",
      detail: `${input.repo.commitsLast14Days} commits in last 14 days.`,
    });
  }

  if (!input.meetings) {
    signals.push({
      key: "MEETING_FREQUENCY",
      label: "Meeting frequency (30d)",
      status: "UNKNOWN",
      detail: "No meeting data available.",
    });
  } else if (input.meetings.recentThirtyDays === 0) {
    signals.push({
      key: "MEETING_FREQUENCY",
      label: "Meeting frequency (30d)",
      status: "ALERT",
      detail: "No team meetings in the last 30 days.",
    });
  } else {
    signals.push({
      key: "MEETING_FREQUENCY",
      label: "Meeting frequency (30d)",
      status: "OK",
      detail: `${input.meetings.recentThirtyDays} meeting(s) in the last 30 days.`,
    });
  }

  if (input.meetings?.attendanceRate == null) {
    signals.push({
      key: "LOW_ATTENDANCE",
      label: "Attendance trend (30d)",
      status: "UNKNOWN",
      detail: "Attendance data has not been marked yet.",
    });
  } else if (input.meetings.attendanceRate < 70) {
    signals.push({
      key: "LOW_ATTENDANCE",
      label: "Attendance trend (30d)",
      status: "ALERT",
      detail: `Attendance is ${input.meetings.attendanceRate}% (threshold: 70%).`,
    });
  } else {
    signals.push({
      key: "LOW_ATTENDANCE",
      label: "Attendance trend (30d)",
      status: "OK",
      detail: `Attendance is ${input.meetings.attendanceRate}%.`,
    });
  }

  if (input.peer?.completionRate == null) {
    signals.push({
      key: "PEER_COMPLETION",
      label: "Peer assessment completion",
      status: "UNKNOWN",
      detail: "Peer-assessment completion data not available.",
    });
  } else if (input.peer.completionRate < 80) {
    signals.push({
      key: "PEER_COMPLETION",
      label: "Peer assessment completion",
      status: "ALERT",
      detail: `${input.peer.completionRate}% completion (threshold: 80%).`,
    });
  } else {
    signals.push({
      key: "PEER_COMPLETION",
      label: "Peer assessment completion",
      status: "OK",
      detail: `${input.peer.completionRate}% completion.`,
    });
  }

  const openSupportRequests = input.requests.filter((request) => !request.resolved).length;
  if (openSupportRequests > 0) {
    signals.push({
      key: "OPEN_SUPPORT_REQUESTS",
      label: "Open support requests",
      status: "ALERT",
      detail: `${openSupportRequests} request${openSupportRequests === 1 ? "" : "s"} awaiting action.`,
    });
  } else {
    signals.push({
      key: "OPEN_SUPPORT_REQUESTS",
      label: "Open support requests",
      status: "OK",
      detail: "No open support requests.",
    });
  }

  return signals;
}
function toTime(value: string | null | undefined) {
  if (!value) return Number.NaN;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.NaN : timestamp;
}

function latestTimestamp(values: Array<string | null | undefined>): string | null {
  let latest = Number.NaN;
  for (const value of values) {
    const timestamp = toTime(value);
    if (Number.isNaN(timestamp)) continue;
    if (Number.isNaN(latest) || timestamp > latest) latest = timestamp;
  }
  if (Number.isNaN(latest)) return null;
  return new Date(latest).toISOString();
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

  const [requestsResult, warningsResult, meetingsResult, repoHealthResult, peerAssessmentResult] = await Promise.allSettled([
    getStaffTeamHealthMessages(user.id, numericProjectId, numericTeamId),
    getStaffTeamWarnings(user.id, numericProjectId, numericTeamId),
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
  const warnings: TeamWarning[] = warningsResult.status === "fulfilled" ? warningsResult.value : [];
  const warningsError =
    warningsResult.status === "rejected"
      ? warningsResult.reason instanceof Error
        ? warningsResult.reason.message
        : "Failed to load warning signals."
      : null;
  const openWarnings = warnings.filter((warning) => warning.active);

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

  const healthSignals = buildHealthSignals({
    teamSize: team.allocations.length,
    repo: repoSummary,
    meetings: meetingSummary,
    peer: peerSummary,
    requests,
  });
  const openSupportRequests = requests.filter((request) => !request.resolved).length;
  const unresolvedNoResponseCount = requests.filter((request) => !request.resolved && !request.responseText?.trim()).length;
  const latestSignalsAt = latestTimestamp([
    ...warnings.map((warning) => warning.updatedAt),
    ...requests.map((request) => request.updatedAt),
    meetingSummary?.lastMeetingAt,
    repoSummary?.latestAnalysedAt,
  ]);
  const compactMetricCardStyle = { padding: "10px 12px", gap: 4 } as const;
  const compactSectionCardStyle = { padding: "12px", gap: 10 } as const;
  const compactInnerCardStyle = { padding: "8px 10px", gap: 4 } as const;
  const compactGridStyle = { gap: 8 } as const;
  const compactPanelStyle = { ...compactSectionCardStyle, fontSize: "0.92rem", lineHeight: 1.35 } as const;
  const compactBlockStyle = { ...compactInnerCardStyle, fontSize: "0.9rem", lineHeight: 1.3 } as const;
  const compactTitleStyle = { margin: 0, fontSize: "1.02rem", lineHeight: 1.2 } as const;
  const compactMutedValueStyle = { fontSize: "1rem", lineHeight: 1.2 } as const;

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
          <Link href={`/staff/projects/${projectData.project.id}/teams/${team.id}`} className="staff-projects__badge">
            Back to team overview
          </Link>
        </div>
      </section>

      <StaffTeamSectionNav projectId={projectId} teamId={teamId} />

      <section className="staff-projects__grid staff-projects__health-metrics" aria-label="Team health overview metrics">
        <article className="staff-projects__card staff-projects__health-metric-card" style={compactMetricCardStyle}>
          <p className="staff-projects__health-metric-label">Active warnings</p>
          <p className="staff-projects__health-metric-value">{openWarnings.length}</p>
        </article>
        <article className="staff-projects__card staff-projects__health-metric-card" style={compactMetricCardStyle}>
          <p className="staff-projects__health-metric-label">Unresolved messages</p>
          <p className="staff-projects__health-metric-value">{openSupportRequests}</p>
          <p className="staff-projects__team-count">{unresolvedNoResponseCount} awaiting response</p>
        </article>
        <article className="staff-projects__card staff-projects__health-metric-card" style={compactMetricCardStyle}>
          <p className="staff-projects__health-metric-label">Latest data refresh</p>
          <p
            className="staff-projects__health-metric-value staff-projects__health-metric-value--muted"
            style={compactMutedValueStyle}
          >
            {formatDateTime(latestSignalsAt)}
          </p>
        </article>
      </section>

      <StaffTeamWarningReviewPanel
        userId={user.id}
        projectId={numericProjectId}
        teamId={numericTeamId}
        initialWarnings={warnings}
        initialError={warningsError}
      />

      <section className="staff-projects__team-list" aria-label="Signal diagnostics">
        <details
          className="staff-projects__team-card staff-projects__team-card--signal staff-projects__collapsible"
          style={compactPanelStyle}
          open={false}
        >
          <summary className="staff-projects__collapsible-summary">
            <div>
              <h3 className="staff-projects__team-title" style={compactTitleStyle}>Signals and diagnostics</h3>
              <p className="staff-projects__team-count">Supporting signal data from meetings, repositories, and assessments.</p>
            </div>
          </summary>
          <div className="staff-projects__signal-sections" style={compactGridStyle}>
            <article className="staff-projects__signal-section" style={compactBlockStyle}>
              <h4 className="staff-projects__signal-section-title" style={compactTitleStyle}>Meetings</h4>
              <p className="staff-projects__team-count">
                Last meeting: {formatDateTime(meetingSummary?.lastMeetingAt ?? null)}
              </p>
              <p className="staff-projects__team-count">
                Attendance (30d):{" "}
                {meetingSummary?.attendanceRate != null ? `${meetingSummary.attendanceRate}%` : "Not available"}
              </p>
              <p className="staff-projects__team-count">
                Meetings with minutes: {meetingSummary?.withMinutes ?? "Not available"}
              </p>
            </article>
            <article className="staff-projects__signal-section" style={compactBlockStyle}>
              <h4 className="staff-projects__signal-section-title" style={compactTitleStyle}>Contributions</h4>
              <p className="staff-projects__team-count">
                Commits (14d): {repoSummary?.commitsLast14Days ?? "Not available"}
              </p>
              <p className="staff-projects__team-count">
                Active coding days (14d): {repoSummary?.activeCommitDaysLast14Days ?? "Not available"}
              </p>
              <p className="staff-projects__team-count">
                Repositories analysed: {repoSummary ? `${repoSummary.analysedRepos}/${repoSummary.linkedRepos}` : "Not available"}
              </p>
            </article>
            <article className="staff-projects__signal-section" style={compactBlockStyle}>
              <h4 className="staff-projects__signal-section-title" style={compactTitleStyle}>Assessments and support</h4>
              <p className="staff-projects__team-count">
                Peer assessments submitted: {peerSummary ? `${peerSummary.submitted}/${peerSummary.expected}` : "Not available"}
              </p>
              <p className="staff-projects__team-count">
                Students with zero submissions: {peerSummary?.missingStudents ?? "Not available"}
              </p>
              <p className="staff-projects__team-count">
                Open support requests: {openSupportRequests}
              </p>
            </article>
          </div>
          <div className="staff-projects__signal-issues" style={compactBlockStyle}>
            <h4 className="staff-projects__signal-section-title" style={compactTitleStyle}>Signals to monitor</h4>
            <dl className="staff-projects__signal-stats">
              {healthSignals.map((signal) => (
                <div key={signal.key} className="staff-projects__signal-stat">
                  <dt>
                    {signal.label}{" "}
                    <span
                      className={`staff-projects__signal-status staff-projects__signal-status--${signal.status.toLowerCase()}`}
                    >
                      {signal.status}
                    </span>
                  </dt>
                  <dd>{signal.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
          {repoError ? <p className="muted" style={{ margin: 0 }}>Repository signal error: {repoError}</p> : null}
          {meetingsError ? <p className="muted" style={{ margin: 0 }}>Meeting signal error: {meetingsError}</p> : null}
          {peerError ? <p className="muted" style={{ margin: 0 }}>Peer signal error: {peerError}</p> : null}
        </details>
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
