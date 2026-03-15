import { prisma } from "../../shared/db.js";
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
  getRecentAttendanceForUser,
  getModuleLeadsForTeam,
} from "./repo.js";
import { getTeamMembers, getTeamById } from "../teamAllocation/service.js";
import { addNotification } from "../notifications/service.js";

const ABSENCES_BEFORE_ALERT = 3;

export function listMeetings(teamId: number) {
  return getMeetingsByTeamId(teamId);
}

export function fetchMeeting(meetingId: number) {
  return getMeetingById(meetingId);
}

export async function addMeeting(data: {
  teamId: number;
  organiserId: number;
  title: string;
  date: Date;
  subject?: string;
  location?: string;
  agenda?: string;
}) {
  const team = await prisma.team.findUnique({ where: { id: data.teamId }, select: { archivedAt: true, inactivityFlag: true } });
  if (team?.archivedAt) throw { code: "TEAM_ARCHIVED" };
  const meeting = await createMeeting(data);
  if (team?.inactivityFlag === "YELLOW") {
    await prisma.team.update({ where: { id: data.teamId }, data: { inactivityFlag: "NONE" } });
  }
  return meeting;
}

export function removeMeeting(meetingId: number) {
  return deleteMeeting(meetingId);
}

async function checkAndNotifyConsecutiveAbsences(
  meetingId: number,
  records: { userId: number; status: string }[]
) {
  const meeting = await getMeetingById(meetingId);
  if (!meeting) return;

  const moduleLeads = await getModuleLeadsForTeam(meeting.teamId);

  for (const record of records) {
    if (record.status.toLowerCase() !== "absent") continue;

    const recent = await getRecentAttendanceForUser(record.userId, meeting.teamId, ABSENCES_BEFORE_ALERT);
    if (recent.length < ABSENCES_BEFORE_ALERT) continue;
    if (!recent.every((a) => a.status.toLowerCase() === "absent")) continue;

    const allocation = meeting.team.allocations.find((a) => a.user.id === record.userId);
    const userName = allocation ? `${allocation.user.firstName} ${allocation.user.lastName}` : "Someone";

    await addNotification({
      userId: record.userId,
      type: "LOW_ATTENDANCE",
      message: `You have missed your last ${ABSENCES_BEFORE_ALERT} team meetings. Your team needs you!`,
      link: `/projects/${meeting.team.projectId}/meetings`,
    });

    for (const lead of moduleLeads) {
      await addNotification({
        userId: lead.userId,
        type: "LOW_ATTENDANCE",
        message: `${userName} has missed their last ${ABSENCES_BEFORE_ALERT} meetings in ${meeting.team.teamName}`,
        link: `/staff/projects/${meeting.team.projectId}/teams/${meeting.teamId}/team-meetings`,
      });
    }
  }
}

export async function markAttendance(meetingId: number, records: { userId: number; status: string }[]) {
  await bulkUpsertAttendance(meetingId, records);
  await checkAndNotifyConsecutiveAbsences(meetingId, records);
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
