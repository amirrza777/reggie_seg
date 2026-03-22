import {
  getMeetingsByTeamId,
  getMeetingById,
  createMeeting,
  getTeamMeetingState,
  clearTeamInactivityFlag,
  deleteMeeting,
  bulkUpsertAttendance,
  upsertMinutes,
  createComment,
  deleteComment,
  createMentions,
  getRecentAttendanceForUser,
  getModuleLeadsForTeam,
} from "./repo.js";
import { getTeamMembers, getTeamById } from "../teamAllocation/service.js";
import { addNotification } from "../notifications/service.js";

const ABSENCES_BEFORE_ALERT = 3;

function resolveTeamMeetingFeedbackDueDate(team: {
  deadlineProfile: "STANDARD" | "MCF" | null;
  deadlineOverride: { feedbackDueDate: Date | null } | null;
  project: {
    archivedAt: Date | null;
    deadline: { feedbackDueDate: Date | null; feedbackDueDateMcf: Date | null } | null;
  } | null;
}) {
  const teamOverrideDueDate = team.deadlineOverride?.feedbackDueDate ?? null;
  if (teamOverrideDueDate) return teamOverrideDueDate;

  const projectDeadline = team.project?.deadline;
  if (!projectDeadline) return null;

  if (team.deadlineProfile === "MCF") {
    return projectDeadline.feedbackDueDateMcf ?? projectDeadline.feedbackDueDate;
  }

  return projectDeadline.feedbackDueDate;
}

function isProjectCompletedForMeetings(
  team: {
    archivedAt: Date | null;
    deadlineProfile: "STANDARD" | "MCF" | null;
    deadlineOverride: { feedbackDueDate: Date | null } | null;
    project: {
      archivedAt: Date | null;
      deadline: { feedbackDueDate: Date | null; feedbackDueDateMcf: Date | null } | null;
    } | null;
  },
  now: Date = new Date(),
) {
  if (team.archivedAt || team.project?.archivedAt) return true;
  const effectiveDueDate = resolveTeamMeetingFeedbackDueDate(team);
  if (!effectiveDueDate) return false;
  return now.getTime() > effectiveDueDate.getTime();
}

/** Returns the meetings. */
export function listMeetings(teamId: number) {
  return getMeetingsByTeamId(teamId);
}

/** Returns the meeting. */
export function fetchMeeting(meetingId: number) {
  return getMeetingById(meetingId);
}

/** Adds a meeting. */
export async function addMeeting(data: {
  teamId: number;
  organiserId: number;
  title: string;
  date: Date;
  subject?: string;
  location?: string;
  agenda?: string;
}) {
  const team = await getTeamMeetingState(data.teamId);
  if (team?.archivedAt) throw { code: "TEAM_ARCHIVED" };
  if (team && isProjectCompletedForMeetings(team)) {
    throw { code: "PROJECT_COMPLETED" };
  }
  const meeting = await createMeeting(data);
  if (team?.inactivityFlag === "YELLOW") {
    await clearTeamInactivityFlag(data.teamId);
  }
  return meeting;
}

/** Removes the meeting. */
export function removeMeeting(meetingId: number) {
  return deleteMeeting(meetingId);
}

/** Marks the attendance. */
export function markAttendance(meetingId: number, records: { userId: number; status: string }[]) {
  return bulkUpsertAttendance(meetingId, records);
}

/** Saves the minutes. */
export function saveMinutes(meetingId: number, writerId: number, content: string) {
  return upsertMinutes(meetingId, writerId, content);
}

/** Adds a comment. */
export function addComment(meetingId: number, userId: number, content: string, teamId?: number) {
  if (typeof teamId === "number") {
    return createComment(meetingId, userId, content, teamId);
  }
  return createComment(meetingId, userId, content);
}

/** Removes the comment. */
export function removeComment(commentId: number) {
  return deleteComment(commentId);
}
