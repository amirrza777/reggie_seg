import { getLatestProjectGithubSnapshot, listProjectGithubRepoLinks } from "@/features/github/api/client";
import { getFeedbackReviewStatuses, getPeerAssessmentsForUser } from "@/features/peerFeedback/api/client";
import { listTeamMeetings } from "@/features/staff/meetings/api/client";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";

export type TeamOverviewMetrics = {
  totalWarnings: number | null;
  assessmentCompletion: number | null;
  meetingCount: number | null;
  totalRepoCommits: number | null;
  averageAttendance: number | null;
  trelloCompletionRate: number | null;
};

const presentStatuses = new Set(["on_time", "late", "present"]);

export function getInitials(firstName: string, lastName: string) {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}

export function getAttendanceRate(meetings: Awaited<ReturnType<typeof listTeamMeetings>>): number | null {
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

export function getAssessmentCompletion(students: Awaited<ReturnType<typeof getTeamDetails>>["students"]): number {
  const expected = students.reduce((sum, student) => sum + Math.max(0, Number(student.expected) || 0), 0);
  const submitted = students.reduce((sum, student) => sum + Math.max(0, Number(student.submitted) || 0), 0);
  if (expected <= 0) return 0;
  return Math.round((submitted / expected) * 100);
}

export function average(values: Array<number | null>): number | null {
  const defined = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (defined.length === 0) return null;
  return Math.round(defined.reduce((sum, value) => sum + value, 0) / defined.length);
}

export function formatCount(value: number | null) {
  return value == null ? "—" : value.toLocaleString();
}

export function formatPercent(value: number | null) {
  return value == null ? "—" : `${value}%`;
}

export function percentage(part: number, total: number): number | null {
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isFinite(part) || part < 0) return 0;
  return Math.round((part / total) * 100);
}

export function getMemberAttendancePercentByUserId(
  meetings: Awaited<ReturnType<typeof listTeamMeetings>>,
): Map<number, number | null> {
  const counts = new Map<number, { marked: number; present: number }>();

  for (const meeting of meetings) {
    const attendances = Array.isArray(meeting.attendances) ? meeting.attendances : [];
    for (const attendance of attendances) {
      const current = counts.get(attendance.userId) ?? { marked: 0, present: 0 };
      current.marked += 1;
      if (presentStatuses.has(attendance.status.trim().toLowerCase())) {
        current.present += 1;
      }
      counts.set(attendance.userId, current);
    }
  }

  const result = new Map<number, number | null>();
  for (const [userId, { marked, present }] of counts.entries()) {
    result.set(userId, marked > 0 ? Math.round((present / marked) * 100) : null);
  }
  return result;
}

export type MemberFeedbackProgress = {
  assigned: number;
  completed: number;
};

export async function loadMemberFeedbackProgress(
  projectId: number,
  memberIds: number[],
): Promise<Map<number, MemberFeedbackProgress>> {
  const rows = await Promise.all(
    memberIds.map(async (memberId) => {
      try {
        const assessments = await getPeerAssessmentsForUser(String(memberId), String(projectId));
        return {
          memberId,
          assessmentIds: assessments.map((assessment) => String(assessment.id)),
          assigned: assessments.length,
        };
      } catch {
        return {
          memberId,
          assessmentIds: [] as string[],
          assigned: 0,
        };
      }
    }),
  );

  const allAssessmentIds = rows.flatMap((row) => row.assessmentIds);
  let statuses: Record<string, boolean> = {};
  if (allAssessmentIds.length > 0) {
    try {
      statuses = await getFeedbackReviewStatuses(allAssessmentIds);
    } catch {
      statuses = {};
    }
  }

  const progressByMemberId = new Map<number, MemberFeedbackProgress>();
  for (const row of rows) {
    const completed = row.assessmentIds.reduce((sum, assessmentId) => sum + (statuses[assessmentId] ? 1 : 0), 0);
    progressByMemberId.set(row.memberId, { assigned: row.assigned, completed });
  }

  return progressByMemberId;
}

export async function loadProjectCommitTotalsByTeam(
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
    const snapshot = snapshotResult.value.snapshot;
    const snapshotTotalCommits = getSnapshotMainCommitTotal(snapshot);

    for (const [teamId, userIds] of teamUserIdsByTeamId.entries()) {
      if (userIds.size === 0) continue;
      totalsByTeam.set(teamId, (totalsByTeam.get(teamId) ?? 0) + snapshotTotalCommits);
    }
  }

  return totalsByTeam;
}

function getSnapshotMainCommitTotal(
  snapshot: Awaited<ReturnType<typeof getLatestProjectGithubSnapshot>>["snapshot"],
): number {
  const fromDefaultBranch = Number(snapshot.data?.branchScopeStats?.defaultBranch?.totalCommits);
  if (Number.isFinite(fromDefaultBranch) && fromDefaultBranch >= 0) {
    return fromDefaultBranch;
  }

  const fromRepoStats = Number(snapshot.repoStats[0]?.totalCommits);
  if (Number.isFinite(fromRepoStats) && fromRepoStats >= 0) {
    return fromRepoStats;
  }

  const fromAllBranches = Number(snapshot.data?.branchScopeStats?.allBranches?.totalCommits);
  if (Number.isFinite(fromAllBranches) && fromAllBranches >= 0) {
    return fromAllBranches;
  }

  return 0;
}

export function formatMessageDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleDateString("en-GB");
}
