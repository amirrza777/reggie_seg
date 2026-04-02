import {
  getMeetingsByTeamId,
  getMeetingById,
  createMeeting,
  updateMeeting,
  replaceParticipants,
  getTeamMeetingState,
  clearTeamInactivityFlag,
  deleteMeeting,
  createParticipants,
  getModuleMeetingSettingsForTeam,
} from "./repo.js";
import { getTeamMembers } from "../teamAllocation/service.js";
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

function escapeIcsText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");
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
    `SUMMARY:${escapeIcsText(meeting.title)}`,
    meeting.location ? `LOCATION:${escapeIcsText(meeting.location)}` : null,
    description ? `DESCRIPTION:${escapeIcsText(description)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}
