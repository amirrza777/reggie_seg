import { getLatestProjectGithubSnapshot, listProjectGithubRepoLinks } from "@/features/github/api/client";
import type { GithubLatestSnapshot } from "@/features/github/types";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import type { Meeting } from "@/features/meetings/types";

export type MeetingHealthSummary = {
  total: number;
  upcoming: number;
  recentThirtyDays: number;
  withMinutes: number;
  attendanceRate: number | null;
  lastMeetingAt: string | null;
};

export type RepoHealthSummary = {
  linkedRepos: number;
  analysedRepos: number;
  commitsByDay: Record<string, number> | null;
  latestAnalysedAt: string | null;
};

export type PeerAssessmentHealthSummary = {
  students: number;
  submitted: number;
  expected: number;
  completionRate: number | null;
  missingStudents: number;
};

export function buildMeetingHealthSummary(meetings: Meeting[]): MeetingHealthSummary {
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

export type SignalLookback = 7 | 14 | 30 | "all";

export function parseSignalLookback(value: string | undefined): SignalLookback {
  if (value === "7") return 7;
  if (value === "14") return 14;
  if (value === "30") return 30;
  if (value === "all") return "all";
  return 30;
}

export function countCommitsForLookback(
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

export async function loadRepoHealthSummary(projectId: number, teamUserIds: number[]): Promise<RepoHealthSummary> {
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

export function buildPeerAssessmentHealthSummary(
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

export function latestTimestamp(values: Array<string | null | undefined>): string | null {
  let latest = Number.NaN;
  for (const value of values) {
    const timestamp = toTime(value);
    if (Number.isNaN(timestamp)) continue;
    if (Number.isNaN(latest) || timestamp > latest) latest = timestamp;
  }
  if (Number.isNaN(latest)) return null;
  return new Date(latest).toISOString();
}
