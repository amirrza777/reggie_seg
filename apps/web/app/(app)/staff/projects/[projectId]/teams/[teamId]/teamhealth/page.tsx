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
import { StaffSignalLookbackSelect } from "@/features/staff/projects/components/StaffSignalLookbackSelect";
import "@/features/staff/projects/styles/staff-projects.css";
import type { TeamHealthMessage, TeamWarning } from "@/features/projects/types";
import type { GithubLatestSnapshot } from "@/features/github/types";
import type { Meeting } from "@/features/meetings/types";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
  searchParams?: Promise<{ lookback?: string | string[] }>;
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
  commitsByDay: Record<string, number> | null;
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

type SignalLookback = 7 | 14 | 30 | "all";

function parseSignalLookback(value: string | undefined): SignalLookback {
  if (value === "7") return 7;
  if (value === "14") return 14;
  if (value === "30") return 30;
  if (value === "all") return "all";
  return 30;
}

function countCommitsForLookback(
  commitsByDay: Record<string, number>,
  nowMs: number,
  lookback: SignalLookback,
) {
  const cutoff = lookback === "all" ? null : nowMs - lookback * 24 * 60 * 60 * 1000;
  let total = 0;
  let activeDays = 0;

  for (const [day, rawCommits] of Object.entries(commitsByDay)) {
    const dayMs = new Date(`${day}T00:00:00.000Z`).getTime();
    if (!Number.isFinite(dayMs) || dayMs > nowMs) continue;
    if (cutoff != null && dayMs < cutoff) continue;

    const commits = Number(rawCommits);
    if (!Number.isFinite(commits)) continue;
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
      commitsByDay: null,
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
      commitsByDay: null,
      latestAnalysedAt,
    };
  }

  return {
    linkedRepos: links.length,
    analysedRepos,
    commitsByDay: Object.fromEntries(aggregateByDay),
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

export default async function StaffTeamHealthPage({ params, searchParams }: PageProps) {
  const { projectId, teamId } = await params;
  const rawSearchParams = searchParams ? await searchParams : undefined;
  const lookbackParam = Array.isArray(rawSearchParams?.lookback) ? rawSearchParams?.lookback[0] : rawSearchParams?.lookback;
  const selectedLookback = parseSignalLookback(lookbackParam);
  const lookbackSelectValue: "7" | "14" | "30" | "all" =
    selectedLookback === "all" ? "all" : String(selectedLookback) as "7" | "14" | "30";
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

  const openSupportRequests = requests.filter((request) => !request.resolved).length;
  const totalIssues = warnings.length + requests.length;
  const latestSignalsAt = latestTimestamp([
    ...warnings.map((warning) => warning.updatedAt),
    ...requests.map((request) => request.updatedAt),
    meetingSummary?.lastMeetingAt,
    repoSummary?.latestAnalysedAt,
  ]);
  const parsedSignalsAtMs = latestSignalsAt ? new Date(latestSignalsAt).getTime() : Number.NaN;
  const fallbackSignalTimestamp = latestTimestamp([
    ...warnings.map((warning) => warning.createdAt),
    ...requests.map((request) => request.createdAt),
    ...(meetingsResult.status === "fulfilled" ? meetingsResult.value.map((meeting) => meeting.date) : []),
  ]);
  const fallbackSignalTimestampMs = fallbackSignalTimestamp ? new Date(fallbackSignalTimestamp).getTime() : Number.NaN;
  const nowMs = Number.isFinite(parsedSignalsAtMs)
    ? parsedSignalsAtMs
    : Number.isFinite(fallbackSignalTimestampMs)
      ? fallbackSignalTimestampMs
      : 0;
  const lookbackCutoff = selectedLookback === "all" ? null : nowMs - selectedLookback * 24 * 60 * 60 * 1000;
  const meetings = meetingsResult.status === "fulfilled" ? meetingsResult.value : [];
  const meetingsInLookback = meetings.filter((meeting) => {
    const dateMs = new Date(meeting.date).getTime();
    if (!Number.isFinite(dateMs) || dateMs > nowMs) return false;
    if (lookbackCutoff == null) return true;
    return dateMs >= lookbackCutoff;
  });
  const meetingsWithMarkedAttendance = meetingsInLookback.filter((meeting) => meeting.attendances.length > 0).length;
  const meetingsWithMinutes = meetingsInLookback.filter((meeting) => Boolean(meeting.minutes?.content?.trim())).length;
  const attendanceCoverage =
    meetingsInLookback.length > 0
      ? Math.round((meetingsWithMarkedAttendance / meetingsInLookback.length) * 100)
      : null;
  const minutesCoverage =
    meetingsInLookback.length > 0
      ? Math.round((meetingsWithMinutes / meetingsInLookback.length) * 100)
      : null;
  const staleOpenRequests = requests.filter((request) => {
    if (request.resolved) return false;
    const createdMs = new Date(request.createdAt).getTime();
    if (!Number.isFinite(createdMs) || createdMs > nowMs) return false;
    if (lookbackCutoff == null) return true;
    return createdMs <= lookbackCutoff;
  }).length;
  const respondedRequests = requests.filter((request) => Boolean(request.responseText?.trim())).length;
  const responseCoverage = requests.length > 0 ? Math.round((respondedRequests / requests.length) * 100) : null;
  const highSeverityOpenWarnings = openWarnings.filter((warning) => warning.severity === "HIGH").length;
  const resolvedWarningsInLookback = warnings.filter((warning) => {
    if (warning.active || !warning.resolvedAt) return false;
    const resolvedMs = new Date(warning.resolvedAt).getTime();
    if (!Number.isFinite(resolvedMs) || resolvedMs > nowMs) return false;
    if (lookbackCutoff == null) return true;
    return resolvedMs >= lookbackCutoff;
  }).length;
  const contributionInLookback =
    repoSummary?.commitsByDay != null ? countCommitsForLookback(repoSummary.commitsByDay, nowMs, selectedLookback) : null;
  const avgOpenWarningAgeDays =
    openWarnings.length > 0
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

  return (
    <div className="staff-projects__team-health-stack">
      <p className="muted">
        Team: {team.teamName} · {openWarnings.length} active warning{openWarnings.length === 1 ? "" : "s"} ·{" "}
        {openSupportRequests} open message{openSupportRequests === 1 ? "" : "s"}
      </p>

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
              <p className="staff-projects__health-metric-value">{totalIssues}</p>
              <p className="staff-projects__team-count">Total issues</p>
            </article>
          </div>
        </article>
      </section>

      <section className="staff-projects__team-list" aria-label="Signal diagnostics">
        <article className="staff-projects__team-card staff-projects__team-card--signal">
          <div className="staff-projects__signal-header">
            <div>
              <h3 className="staff-projects__team-title">Signals and diagnostics</h3>
              <p className="staff-projects__team-count">Supporting signal data from meetings, repositories, and assessments.</p>
            </div>
            <StaffSignalLookbackSelect value={lookbackSelectValue} />
          </div>
          <div className="staff-projects__health-insights-grid">
            <article className="staff-projects__health-insight">
              <p className="staff-projects__health-insight-label">Attendance coverage</p>
              <p className="staff-projects__health-insight-value">
                {attendanceCoverage == null ? "No meetings" : `${attendanceCoverage}%`}
              </p>
              <p className="staff-projects__health-insight-sub">
                {meetingsWithMarkedAttendance}/{meetingsInLookback.length} meetings have attendance marked.
              </p>
            </article>
            <article className="staff-projects__health-insight">
              <p className="staff-projects__health-insight-label">Minutes coverage</p>
              <p className="staff-projects__health-insight-value">
                {minutesCoverage == null ? "No meetings" : `${minutesCoverage}%`}
              </p>
              <p className="staff-projects__health-insight-sub">
                {meetingsWithMinutes}/{meetingsInLookback.length} meetings have minutes.
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
              <p className="staff-projects__health-insight-sub">
                Unresolved support requests needing follow-up.
              </p>
            </article>
          </div>

          <div className="staff-projects__signal-sections">
            <article className="staff-projects__signal-section">
              <h4 className="staff-projects__signal-section-title">Warning lifecycle</h4>
              <dl className="staff-projects__signal-kv">
                <div><dt>High severity open</dt><dd>{highSeverityOpenWarnings}</dd></div>
                <div><dt>Resolved</dt><dd>{resolvedWarningsInLookback}</dd></div>
                <div><dt>Avg open age</dt><dd>{avgOpenWarningAgeDays == null ? "—" : `${avgOpenWarningAgeDays}d`}</dd></div>
              </dl>
            </article>
            <article className="staff-projects__signal-section">
              <h4 className="staff-projects__signal-section-title">Contribution diagnostics</h4>
              <dl className="staff-projects__signal-kv">
                <div><dt>Commits</dt><dd>{contributionInLookback?.total ?? "—"}</dd></div>
                <div><dt>Active coding days</dt><dd>{contributionInLookback?.activeDays ?? "—"}</dd></div>
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

          {repoError ? <p className="muted" style={{ margin: 0 }}>Repository signal error: {repoError}</p> : null}
          {meetingsError ? <p className="muted" style={{ margin: 0 }}>Meeting signal error: {meetingsError}</p> : null}
          {peerError ? <p className="muted" style={{ margin: 0 }}>Peer signal error: {peerError}</p> : null}
        </article>
      </section>

      <StaffTeamWarningReviewPanel
        userId={user.id}
        projectId={numericProjectId}
        teamId={numericTeamId}
        initialWarnings={warnings}
        initialError={warningsError}
      />

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
