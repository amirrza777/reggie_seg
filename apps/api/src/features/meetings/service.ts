import { prisma } from "../../shared/db.js";
import { assertProjectMutableForWritesByTeamId } from "../../shared/projectWriteGuard.js";
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

function resolveTeamMeetingFeedbackDueDate(team: {
  deadlineProfile: "STANDARD" | "MCF" | null;
  deadlineOverride: { feedbackDueDate: Date | null } | null;
  project: {
    archivedAt: Date | null;
    module?: { archivedAt: Date | null } | null;
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
      module?: { archivedAt: Date | null } | null;
      deadline: { feedbackDueDate: Date | null; feedbackDueDateMcf: Date | null } | null;
    } | null;
  },
  now: Date = new Date(),
) {
  if (team.archivedAt || team.project?.archivedAt || team.project?.module?.archivedAt) return true;
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
  if (team?.project?.module?.archivedAt) throw { code: "MODULE_ARCHIVED" };
  if (team && isProjectCompletedForMeetings(team)) {
    throw { code: "PROJECT_COMPLETED" };
  }
  const meeting = await createMeeting(meetingData);
  if (team?.inactivityFlag === "YELLOW") {
    await clearTeamInactivityFlag(data.teamId);
  }
  const members = await getTeamMembers(data.teamId);
  const recipients = participantIds ? members.filter((m) => participantIds.includes(m.id)) : members;
  await createParticipants(meeting.id, recipients.map((m) => m.id));
  await Promise.all(
    recipients
      .filter((m) => m.id !== data.organiserId)
      .map((m) =>
        addNotification({
          userId: m.id,
          type: "MEETING_CREATED",
          message: `A new meeting has been scheduled: ${data.title}`,
          link: `/projects/${team?.projectId}/meetings/${meeting.id}`,
        })
      )
  );
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
  await assertProjectMutableForWritesByTeamId(meeting.teamId);
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
  await Promise.all(
    meeting.participants
      .filter((p) => p.userId !== userId)
      .map((p) =>
        addNotification({
          userId: p.userId,
          type: "MEETING_UPDATED",
          message: `The meeting "${data.title ?? meeting.title}" has been updated`,
          link: `/projects/${meeting.team.projectId}/meetings/${meetingId}`,
        })
      )
  );
  return updated;
}

/** Removes the meeting. */
export async function removeMeeting(meetingId: number) {
  const meeting = await getMeetingById(meetingId);
  if (meeting) {
    await assertProjectMutableForWritesByTeamId(meeting.teamId);
    await Promise.all(
      meeting.participants.map((p) =>
        addNotification({
          userId: p.userId,
          type: "MEETING_DELETED",
          message: `The meeting "${meeting.title}" has been removed`,
          link: `/projects/${meeting.team.projectId}/meetings`,
        })
      )
    );
  }
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
  const meetingForTeam = await getMeetingById(meetingId);
  if (!meetingForTeam) throw { code: "NOT_FOUND" };
  await assertProjectMutableForWritesByTeamId(meetingForTeam.teamId);
  await bulkUpsertAttendance(meetingId, records);
  await checkAndNotifyConsecutiveAbsences(meetingId, records);
}

/** Saves the minutes. */
export async function saveMinutes(meetingId: number, writerId: number, content: string) {
  const meeting = await getMeetingById(meetingId);
  if (!meeting) throw { code: "NOT_FOUND" };
  await assertProjectMutableForWritesByTeamId(meeting.teamId);
  const isOriginalWriter = meeting.minutes?.writerId === writerId;
  if (meeting.minutes && !isOriginalWriter) {
    const settings = await getModuleMeetingSettingsForTeam(meeting.teamId);
    const isMember = meeting.team.allocations.some((a) => a.userId === writerId);
    if (!settings.allowAnyoneToWriteMinutes || !isMember) throw { code: "FORBIDDEN" };
  }
  return upsertMinutes(meetingId, writerId, content);
}

export function parseMentions(content: string): string[] {
  const matches = content.match(/@([\p{L}][\p{L}'’-]*\s+[\p{L}][\p{L}'’-]*)/gu);
  if (!matches) return [];

  const seen = new Set<string>();
  const mentions: string[] = [];
  for (const mention of matches) {
    const normalized = mention.slice(1).trim().replace(/\s+/g, " ");
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    mentions.push(normalized);
  }
  return mentions;
}

function normalizeMentionName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

async function processMentions(
  commentId: number,
  meetingId: number,
  userId: number,
  content: string,
  teamId: number,
) {
  const mentionedNames = parseMentions(content);
  if (mentionedNames.length === 0) return;

  const members = await getTeamMembers(teamId);
  const membersByName = new Map<string, number[]>();
  for (const member of members) {
    const key = normalizeMentionName(`${member.firstName} ${member.lastName}`);
    const ids = membersByName.get(key) ?? [];
    ids.push(member.id);
    membersByName.set(key, ids);
  }

  const mentionedIds = new Set<number>();
  for (const mentionedName of mentionedNames) {
    const matchedIds = (membersByName.get(normalizeMentionName(mentionedName)) ?? []).filter((id) => id !== userId);
    // Skip ambiguous names so we don't notify the wrong person when multiple members share a full name.
    if (matchedIds.length === 1) {
      const [id] = matchedIds;
      mentionedIds.add(id);
    }
  }

  const uniqueMentionedIds = [...mentionedIds];
  if (uniqueMentionedIds.length === 0) return;

  await createMentions(commentId, uniqueMentionedIds);

  const team = await getTeamById(teamId);
  const author = members.find((member) => member.id === userId);
  const authorName = author ? `${author.firstName} ${author.lastName}` : "Someone";

  for (const mentionedId of uniqueMentionedIds) {
    await addNotification({
      userId: mentionedId,
      type: "MENTION",
      message: `${authorName} mentioned you in a comment`,
      link: `/projects/${team.projectId}/meetings/${meetingId}`,
    });
  }
}

export async function addComment(meetingId: number, userId: number, content: string, teamId?: number) {
  const meetingRow = await getMeetingById(meetingId);
  if (!meetingRow) throw { code: "NOT_FOUND" };
  await assertProjectMutableForWritesByTeamId(meetingRow.teamId);
  const comment = await createComment(meetingId, userId, content);
  if (teamId) {
    try {
      await processMentions(comment.id, meetingId, userId, content, teamId);
    } catch (error) {
      console.error("Failed to process comment mentions:", error);
    }
  }
  return comment;
}

/** Removes the comment. */
export async function removeComment(commentId: number) {
  const row = await prisma.meetingComment.findUnique({
    where: { id: commentId },
    select: { meeting: { select: { teamId: true } } },
  });
  if (row?.meeting?.teamId != null) {
    await assertProjectMutableForWritesByTeamId(row.meeting.teamId);
  }
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
