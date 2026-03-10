import {
  getMeetingsByTeamId,
  getMeetingById,
  createMeeting,
  deleteMeeting,
  bulkUpsertAttendance,
  upsertMinutes,
  createComment,
  deleteComment,
  createMentions,
} from "./repo.js";
import { getTeamMembers, getTeamById } from "../teamAllocation/service.js";
import { addNotification } from "../notifications/service.js";

export function listMeetings(teamId: number) {
  return getMeetingsByTeamId(teamId);
}

export function fetchMeeting(meetingId: number) {
  return getMeetingById(meetingId);
}

export function addMeeting(data: {
  teamId: number;
  organiserId: number;
  title: string;
  date: Date;
  subject?: string;
  location?: string;
  agenda?: string;
}) {
  return createMeeting(data);
}

export function removeMeeting(meetingId: number) {
  return deleteMeeting(meetingId);
}

export function markAttendance(meetingId: number, records: { userId: number; status: string }[]) {
  return bulkUpsertAttendance(meetingId, records);
}

export function saveMinutes(meetingId: number, writerId: number, content: string) {
  return upsertMinutes(meetingId, writerId, content);
}

export function parseMentions(content: string): string[] {
  const matches = content.match(/@([A-Za-z]+\s[A-Za-z]+)/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1));
}

async function processMentions(commentId: number, meetingId: number, userId: number, content: string, teamId: number) {
  const mentionedNames = parseMentions(content);
  if (mentionedNames.length === 0) return;

  const members = await getTeamMembers(teamId);
  const mentionedIds = members
    .filter((m) => mentionedNames.includes(`${m.firstName} ${m.lastName}`))
    .map((m) => m.id)
    .filter((id) => id !== userId);

  if (mentionedIds.length === 0) return;

  await createMentions(commentId, mentionedIds);

  const team = await getTeamById(teamId);
  const author = members.find((m) => m.id === userId);
  const authorName = author ? `${author.firstName} ${author.lastName}` : "Someone";

  for (const mentionedId of mentionedIds) {
    await addNotification({
      userId: mentionedId,
      type: "MENTION",
      message: `${authorName} mentioned you in a comment`,
      link: `/projects/${team.projectId}/meetings/${meetingId}`,
    });
  }
}

export async function addComment(meetingId: number, userId: number, content: string, teamId?: number) {
  const comment = await createComment(meetingId, userId, content);
  if (teamId) {
    await processMentions(comment.id, meetingId, userId, content, teamId);
  }
  return comment;
}

export function removeComment(commentId: number) {
  return deleteComment(commentId);
}
