import {
  getMeetingsByTeamId,
  getMeetingById,
  createMeeting,
  updateMeeting,
  replaceParticipants,
  getTeamMeetingState,
  clearTeamInactivityFlag,
  deleteMeeting,
  bulkUpsertAttendance,
  upsertMinutes,
  createComment,
  deleteComment,
  createMentions,
  createParticipants,
  getRecentAttendanceForUser,
  getModuleLeadsForTeam,
  getModuleMeetingSettingsForTeam,
} from "./repo.js";
import { getTeamMembers, getTeamById } from "../teamAllocation/service.js";
import { addNotification } from "../notifications/service.js";
import { sendEmail } from "../../shared/email.js";

/** Returns the meetings. */
export function listMeetings(teamId: number) {
  return getMeetingsByTeamId(teamId);
}

/** Returns the meeting. */
export function fetchMeeting(meetingId: number) {
  return getMeetingById(meetingId);
}

function buildIcs(meeting: {
  title: string;
  date: Date;
  location?: string | null;
  videoCallLink?: string | null;
  agenda?: string | null;
}): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const start = fmt(meeting.date);
  const end = fmt(new Date(meeting.date.getTime() + 60 * 60 * 1000));
  const descParts = [];
  if (meeting.agenda) descParts.push(meeting.agenda);
  if (meeting.videoCallLink) descParts.push(`Video call: ${meeting.videoCallLink}`);
  const description = descParts.join("\\n\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Reggie//Reggie//EN",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${meeting.title}`,
    meeting.location ? `LOCATION:${meeting.location}` : null,
    description ? `DESCRIPTION:${description}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

/** Adds a meeting. */
export async function addMeeting(data: {
  teamId: number;
  organiserId: number;
  title: string;
  date: Date;
  subject?: string;
  location?: string;
  videoCallLink?: string;
  agenda?: string;
  participantIds?: number[];
}) {
  const { participantIds, ...meetingData } = data;
  const team = await getTeamMeetingState(data.teamId);
  if (team?.archivedAt) throw { code: "TEAM_ARCHIVED" };
  const meeting = await createMeeting(meetingData);
  if (team?.inactivityFlag === "YELLOW") {
    await clearTeamInactivityFlag(data.teamId);
  }
  const members = await getTeamMembers(data.teamId);
  const recipients = participantIds ? members.filter((m) => participantIds.includes(m.id)) : members;
  await createParticipants(meeting.id, recipients.map((m) => m.id));
  const ics = buildIcs({ title: data.title, date: data.date, location: data.location, videoCallLink: data.videoCallLink, agenda: data.agenda });
  const body = [
    `A new meeting has been scheduled: ${data.title}`,
    `Date: ${data.date.toUTCString()}`,
    data.location ? `Location: ${data.location}` : null,
    data.videoCallLink ? `Video call: ${data.videoCallLink}` : null,
    data.agenda ? `\nAgenda:\n${data.agenda}` : null,
  ].filter(Boolean).join("\n");
  await Promise.all(
    recipients.map((member) =>
      sendEmail({
        to: member.email,
        subject: `New meeting: ${data.title}`,
        text: body,
        attachments: [{ filename: "meeting.ics", content: ics }],
      })
    )
  );
  return meeting;
}

export async function editMeeting(meetingId: number, userId: number, data: {
  title?: string;
  date?: Date;
  subject?: string;
  location?: string;
  videoCallLink?: string;
  agenda?: string;
  participantIds?: number[];
}) {
  const meeting = await getMeetingById(meetingId);
  if (!meeting) throw { code: "NOT_FOUND" };
  if (new Date(meeting.date) < new Date()) throw { code: "MEETING_PASSED" };
  const isOrganiser = meeting.organiserId === userId;
  if (!isOrganiser) {
    const settings = await getModuleMeetingSettingsForTeam(meeting.teamId);
    const isMember = meeting.team.allocations.some((a) => a.userId === userId);
    if (!settings.allowAnyoneToEditMeetings || !isMember) throw { code: "FORBIDDEN" };
  }
  const { participantIds, ...meetingData } = data;
  const updated = await updateMeeting(meetingId, meetingData);
  if (participantIds !== undefined) {
    await replaceParticipants(meetingId, participantIds);
  }
  return updated;
}

/** Removes the meeting. */
export function removeMeeting(meetingId: number) {
  return deleteMeeting(meetingId);
}

async function checkAndNotifyConsecutiveAbsences(
  meetingId: number,
  records: { userId: number; status: string }[]
) {
  const meeting = await getMeetingById(meetingId);
  if (!meeting) return;

  const { absenceThreshold } = await getModuleMeetingSettingsForTeam(meeting.teamId);
  const moduleLeads = await getModuleLeadsForTeam(meeting.teamId);

  for (const record of records) {
    if (record.status.toLowerCase() !== "absent") continue;

    const recent = await getRecentAttendanceForUser(record.userId, meeting.teamId, absenceThreshold);
    if (recent.length < absenceThreshold) continue;
    if (!recent.every((a) => a.status.toLowerCase() === "absent")) continue;

    const allocation = meeting.team.allocations.find((a) => a.user.id === record.userId);
    const userName = allocation ? `${allocation.user.firstName} ${allocation.user.lastName}` : "Someone";

    await addNotification({
      userId: record.userId,
      type: "LOW_ATTENDANCE",
      message: `You have missed your last ${absenceThreshold} team meetings. Your team needs you!`,
      link: `/projects/${meeting.team.projectId}/meetings`,
    });

    for (const lead of moduleLeads) {
      await addNotification({
        userId: lead.userId,
        type: "LOW_ATTENDANCE",
        message: `${userName} has missed their last ${absenceThreshold} meetings in ${meeting.team.teamName}`,
        link: `/staff/projects/${meeting.team.projectId}/teams/${meeting.teamId}/team-meetings`,
      });
    }
  }
}

/** Marks the attendance. */
export async function markAttendance(meetingId: number, records: { userId: number; status: string }[]) {
  await bulkUpsertAttendance(meetingId, records);
  await checkAndNotifyConsecutiveAbsences(meetingId, records);
}

/** Saves the minutes. */
export async function saveMinutes(meetingId: number, writerId: number, content: string) {
  const meeting = await getMeetingById(meetingId);
  if (!meeting) throw { code: "NOT_FOUND" };
  const isOriginalWriter = meeting.minutes?.writerId === writerId;
  if (meeting.minutes && !isOriginalWriter) {
    const settings = await getModuleMeetingSettingsForTeam(meeting.teamId);
    const isMember = meeting.team.allocations.some((a) => a.userId === writerId);
    if (!settings.allowAnyoneToWriteMinutes || !isMember) throw { code: "FORBIDDEN" };
  }
  return upsertMinutes(meetingId, writerId, content);
}

export async function addComment(meetingId: number, userId: number, content: string, teamId?: number) {
  const comment = await createComment(meetingId, userId, content);
  if (teamId) {
    await processMentions(comment.id, meetingId, userId, content, teamId);
  }
  return comment;
}

/** Removes the comment. */
export function removeComment(commentId: number) {
  return deleteComment(commentId);
}

/** Returns the module meeting settings for a meeting. */
export async function fetchMeetingSettings(meetingId: number) {
  const meeting = await getMeetingById(meetingId);
  if (!meeting) return null;
  return getModuleMeetingSettingsForTeam(meeting.teamId);
}

/** Returns the module meeting settings for a team. */
export function fetchTeamMeetingSettings(teamId: number) {
  return getModuleMeetingSettingsForTeam(teamId);
}

export function parseMentions(content: string) {
  const mentionMatches = content.match(/@([A-Za-z]+(?:\s+[A-Za-z]+))/g) ?? [];
  return mentionMatches.map((match) => match.slice(1).trim());
}

async function processMentions(
  commentId: number,
  meetingId: number,
  authorId: number,
  content: string,
  teamId: number,
) {
  const mentions = parseMentions(content);
  if (mentions.length === 0) return;

  const [teamMembers, team] = await Promise.all([getTeamMembers(teamId), getTeamById(teamId)]);
  const mentionedUsers = teamMembers.filter((member) => {
    if (member.id === authorId) return false;
    const fullName = `${member.firstName} ${member.lastName}`.trim();
    return mentions.includes(fullName);
  });

  if (mentionedUsers.length === 0) return;

  const mentionedUserIds = [...new Set(mentionedUsers.map((member) => member.id))];
  await createMentions(commentId, mentionedUserIds);

  await Promise.all(
    mentionedUserIds.map((mentionedUserId) =>
      addNotification({
        userId: mentionedUserId,
        type: "MENTION",
        message: "You were mentioned in a meeting comment",
        link: `/projects/${team.projectId}/meetings/${meetingId}`,
      }),
    ),
  );
}
