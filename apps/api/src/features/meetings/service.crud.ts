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
import { assertProjectMutableForWritesByTeamId } from "../../shared/projectWriteGuard.js";
import { getTeamMembers } from "../teamAllocation/service.js";
import { addNotification } from "../notifications/service.js";
import { sendEmail } from "../../shared/email.js";
import { buildIcs } from "../../../../../packages/shared/src/ics/index.js";

/** Returns the meetings. */
export function listMeetings(teamId: number) {
  return getMeetingsByTeamId(teamId);
}

/** Returns the meeting. */
export function fetchMeeting(meetingId: number) {
  return getMeetingById(meetingId);
}

type MeetingInput = {
  teamId: number;
  organiserId: number;
  title: string;
  date: Date;
  subject?: string;
  location?: string;
  videoCallLink?: string;
  agenda?: string;
  participantIds?: number[];
};

function notifyMeetingCreated(
  recipients: { id: number }[],
  organiserId: number,
  title: string,
  projectId: number | undefined,
  meetingId: number,
) {
  return Promise.all(
    recipients
      .filter((m) => m.id !== organiserId)
      .map((m) =>
        addNotification({
          userId: m.id,
          type: "MEETING_CREATED",
          message: `A new meeting has been scheduled: ${title}`,
          link: `/projects/${projectId}/meetings/${meetingId}`,
        })
      )
  );
}

function sendMeetingInviteEmails(
  recipients: { email: string }[],
  data: MeetingInput,
) {
  const ics = buildIcs({ title: data.title, date: data.date, location: data.location, videoCallLink: data.videoCallLink, agenda: data.agenda });
  const body = [
    `A new meeting has been scheduled: ${data.title}`,
    `Date: ${data.date.toUTCString()}`,
    data.location ? `Location: ${data.location}` : null,
    data.videoCallLink ? `Video call: ${data.videoCallLink}` : null,
    data.agenda ? `\nAgenda:\n${data.agenda}` : null,
  ].filter(Boolean).join("\n");
  return Promise.all(
    recipients.map((member) =>
      sendEmail({
        to: member.email,
        subject: `New meeting: ${data.title}`,
        text: body,
        attachments: [{ filename: "meeting.ics", content: ics }],
      })
    )
  );
}

export async function addMeeting(data: MeetingInput) {
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
  await notifyMeetingCreated(recipients, data.organiserId, data.title, team?.projectId, meeting.id);
  await sendMeetingInviteEmails(recipients, data);
  return meeting;
}

type MeetingUpdateInput = {
  title?: string;
  date?: Date;
  subject?: string;
  location?: string;
  videoCallLink?: string;
  agenda?: string;
  participantIds?: number[];
};

export async function editMeeting(meetingId: number, userId: number, data: MeetingUpdateInput) {
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

