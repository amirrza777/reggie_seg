import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffTeamHealthMessages, getStaffTeamWarnings } from "@/features/projects/api/client";
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
  const actionSignals = healthSignals.filter((signal) => signal.status !== "OK");
  const openSupportRequests = requests.filter((request) => !request.resolved).length;
  const unresolvedNoResponseCount = requests.filter((request) => !request.resolved && !request.responseText?.trim()).length;
  const totalAlerts = openWarnings.length + openSupportRequests;
  const latestSignalsAt = latestTimestamp([
    ...warnings.map((warning) => warning.updatedAt),
    ...requests.map((request) => request.updatedAt),
    meetingSummary?.lastMeetingAt,
    repoSummary?.latestAnalysedAt,
  ]);
  const nowMs = latestSignalsAt ? new Date(latestSignalsAt).getTime() : Number.NaN;
  const canUseTimeAnchor = Number.isFinite(nowMs);
  const recentThirtyDaysCutoff = nowMs - 30 * 24 * 60 * 60 * 1000;
  const staleSupportCutoff = nowMs - 7 * 24 * 60 * 60 * 1000;
  const resolvedWarnings14Cutoff = nowMs - 14 * 24 * 60 * 60 * 1000;
  const meetings = meetingsResult.status === "fulfilled" ? meetingsResult.value : [];
  const recentThirtyMeetings = meetings.filter((meeting) => {
    if (!canUseTimeAnchor) return false;
    const dateMs = new Date(meeting.date).getTime();
    return Number.isFinite(dateMs) && dateMs <= nowMs && dateMs >= recentThirtyDaysCutoff;
  });
  const meetingsWithMarkedAttendance30 = recentThirtyMeetings.filter((meeting) => meeting.attendances.length > 0).length;
  const meetingsWithMinutes30 = recentThirtyMeetings.filter((meeting) => Boolean(meeting.minutes?.content?.trim())).length;
  const attendanceCoverage30 =
    recentThirtyMeetings.length > 0
      ? Math.round((meetingsWithMarkedAttendance30 / recentThirtyMeetings.length) * 100)
      : null;
  const minutesCoverage30 =
    recentThirtyMeetings.length > 0
      ? Math.round((meetingsWithMinutes30 / recentThirtyMeetings.length) * 100)
      : null;
  const staleOpenRequests = requests.filter((request) => {
    if (!canUseTimeAnchor) return false;
    if (request.resolved) return false;
    const createdMs = new Date(request.createdAt).getTime();
    return Number.isFinite(createdMs) && createdMs <= staleSupportCutoff;
  }).length;
  const respondedRequests = requests.filter((request) => Boolean(request.responseText?.trim())).length;
  const responseCoverage = requests.length > 0 ? Math.round((respondedRequests / requests.length) * 100) : null;
  const highSeverityOpenWarnings = openWarnings.filter((warning) => warning.severity === "HIGH").length;
  const resolvedWarningsLast14Days = warnings.filter((warning) => {
    if (!canUseTimeAnchor) return false;
    if (warning.active || !warning.resolvedAt) return false;
    const resolvedMs = new Date(warning.resolvedAt).getTime();
    return Number.isFinite(resolvedMs) && resolvedMs >= resolvedWarnings14Cutoff;
  }).length;
  const avgOpenWarningAgeDays =
    openWarnings.length > 0 && canUseTimeAnchor
      ? Math.round(
          openWarnings.reduce((sum, warning) => {
            const createdMs = new Date(warning.createdAt).getTime();
            if (!Number.isFinite(createdMs)) return sum;
            return sum + Math.max(0, nowMs - createdMs);
          }, 0) /
            openWarnings.length /
            (24 * 60 * 60 * 1000),
        )
      : null;
  const availableSignalSources = [
    meetingsResult.status === "fulfilled",
    Boolean(repoSummary && repoSummary.analysedRepos > 0),
    peerAssessmentResult.status === "fulfilled",
  ].filter(Boolean).length;

  return (
    <>
      <section className="staff-projects__team-list" aria-label="Team health snapshot">
        <article className="staff-projects__team-card staff-projects__team-card--signal">


          <div className="staff-projects__grid staff-projects__health-metrics">
            <article className="staff-projects__team-card staff-projects__health-metric-card">
              <p className="staff-projects__health-metric-value">{openWarnings.length}</p>
              <p className="staff-projects__team-count">Active warnings</p>
            </article>
            <article className="staff-projects__team-card staff-projects__health-metric-card">
              <p className="staff-projects__health-metric-value">{openSupportRequests}</p>
              <p className="staff-projects__team-count">
                Unresolved messages
              </p>
            </article>
            <article className="staff-projects__team-card staff-projects__health-metric-card">
              <p className="staff-projects__health-metric-value">{totalAlerts}</p>
              <p className="staff-projects__team-count">Total alerts</p>
            </article>
          </div>
        </article>
      </section>

      <section className="staff-projects__team-list" aria-label="Signal diagnostics">
        <article className="staff-projects__team-card staff-projects__team-card--signal">
          <div>
            <h3 className="staff-projects__team-title">Signals and diagnostics</h3>
            <p className="staff-projects__team-count">Supporting signal data from meetings, repositories, and assessments.</p>
          </div>
          <div className="staff-projects__health-insights-grid">
            <article className="staff-projects__health-insight">
              <p className="staff-projects__health-insight-label">Attendance coverage (30d)</p>
              <p className="staff-projects__health-insight-value">
                {attendanceCoverage30 == null ? "No meetings" : `${attendanceCoverage30}%`}
              </p>
              <p className="staff-projects__health-insight-sub">
                {meetingsWithMarkedAttendance30}/{recentThirtyMeetings.length} meetings have attendance marked.
              </p>
            </article>
            <article className="staff-projects__health-insight">
              <p className="staff-projects__health-insight-label">Minutes coverage (30d)</p>
              <p className="staff-projects__health-insight-value">
                {minutesCoverage30 == null ? "No meetings" : `${minutesCoverage30}%`}
              </p>
              <p className="staff-projects__health-insight-sub">
                {meetingsWithMinutes30}/{recentThirtyMeetings.length} meetings have minutes.
              </p>
            </article>
            <article className="staff-projects__health-insight">
              <p className="staff-projects__health-insight-label">Response coverage</p>
              <p className="staff-projects__health-insight-value">
                {responseCoverage == null ? "No requests" : `${responseCoverage}%`}
              </p>
              <p className="staff-projects__health-insight-sub">
                {respondedRequests}/{requests.length} support requests have staff responses.
              </p>
            </article>
            <article className="staff-projects__health-insight">
              <p className="staff-projects__health-insight-label">Stale open requests</p>
              <p className="staff-projects__health-insight-value">{staleOpenRequests}</p>
              <p className="staff-projects__health-insight-sub">Open for more than 7 days.</p>
            </article>
          </div>

          <div className="staff-projects__signal-sections">
            <article className="staff-projects__signal-section">
              <h4 className="staff-projects__signal-section-title">Warning lifecycle</h4>
              <dl className="staff-projects__signal-kv">
                <div><dt>High severity open</dt><dd>{highSeverityOpenWarnings}</dd></div>
                <div><dt>Resolved in 14d</dt><dd>{resolvedWarningsLast14Days}</dd></div>
                <div><dt>Avg open age</dt><dd>{avgOpenWarningAgeDays == null ? "—" : `${avgOpenWarningAgeDays}d`}</dd></div>
              </dl>
            </article>
            <article className="staff-projects__signal-section">
              <h4 className="staff-projects__signal-section-title">Contribution diagnostics</h4>
              <dl className="staff-projects__signal-kv">
                <div><dt>Commits (14d)</dt><dd>{repoSummary?.commitsLast14Days ?? "—"}</dd></div>
                <div><dt>Active coding days</dt><dd>{repoSummary?.activeCommitDaysLast14Days ?? "—"}</dd></div>
                <div><dt>Repo data coverage</dt><dd>{repoSummary ? `${repoSummary.analysedRepos}/${repoSummary.linkedRepos}` : "—"}</dd></div>
              </dl>
            </article>
            <article className="staff-projects__signal-section">
              <h4 className="staff-projects__signal-section-title">Assessment diagnostics</h4>
              <dl className="staff-projects__signal-kv">
                <div><dt>Submissions</dt><dd>{peerSummary ? `${peerSummary.submitted}/${peerSummary.expected}` : "—"}</dd></div>
                <div><dt>Completion rate</dt><dd>{peerSummary?.completionRate == null ? "—" : `${peerSummary.completionRate}%`}</dd></div>
                <div><dt>Zero submissions</dt><dd>{peerSummary?.missingStudents ?? "—"}</dd></div>
              </dl>
            </article>
          </div>

          <div className="staff-projects__signal-issues">
            <h4 className="staff-projects__signal-section-title">Action queue</h4>
            {actionSignals.length === 0 ? (
              <p className="staff-projects__team-count">No alerting signals right now.</p>
            ) : null}
            <dl className="staff-projects__signal-stats">
              {actionSignals.map((signal) => (
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
        </article>
      </section>

      <section className="staff-projects__team-list" aria-label="Warning review">
        <StaffTeamWarningReviewPanel
          userId={user.id}
          projectId={numericProjectId}
          teamId={numericTeamId}
          initialWarnings={warnings}
          initialError={warningsError}
        />
      </section>

      <section className="staff-projects__team-list" aria-label="Message review">
        <StaffTeamHealthMessageReviewPanel
          userId={user.id}
          projectId={numericProjectId}
          teamId={numericTeamId}
          initialRequests={requests}
          initialError={requestsError}
        />
      </section>
    </>
  );
}
