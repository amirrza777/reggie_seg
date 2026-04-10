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
import { getTeamMembers } from "../teamAllocation/service/service.js";
import { addNotification } from "../notifications/service.js";
import { sendEmail } from "../../shared/email.js";
import { buildIcs } from "./ics.js";

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

type MeetingCreatedNotificationContext = {
  organiserId: number;
  title: string;
  projectId: number | undefined;
  meetingId: number;
};

type TeamMeetingState = Awaited<ReturnType<typeof getTeamMeetingState>>;
type MeetingWithDetails = NonNullable<Awaited<ReturnType<typeof getMeetingById>>>;

function notifyMeetingCreated(
  recipients: { id: number }[],
  context: MeetingCreatedNotificationContext,
) {
  return Promise.all(
    recipients
      .filter((m) => m.id !== context.organiserId)
      .map((m) =>
        addNotification({
          userId: m.id,
          type: "MEETING_CREATED",
          message: `A new meeting has been scheduled: ${context.title}`,
          link: `/projects/${context.projectId}/meetings/${context.meetingId}`,
        })
      )
  );
}

function sendMeetingInviteEmails(
  recipients: { email: string }[],
  data: MeetingInput,
  meetingUrl: string | null,
) {
  const ics = buildIcs({ title: data.title, date: data.date, location: data.location, videoCallLink: data.videoCallLink, agenda: data.agenda });
  const body = [
    "A new meeting has been scheduled in Team Feedback.",
    `Title: ${data.title}`,
    `Date (UTC): ${data.date.toUTCString()}`,
    data.location ? `Location: ${data.location}` : null,
    data.videoCallLink ? `Video call: ${data.videoCallLink}` : null,
    data.agenda ? `Agenda:\n${data.agenda}` : null,
    meetingUrl ? `Open meeting details: ${meetingUrl}` : null,
    "Calendar attachment: meeting.ics",
    "",
    "You are receiving this email because you are listed as a participant.",
    "If any details look incorrect, contact your meeting organiser or module staff.",
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

function assertTeamCanCreateMeeting(team: TeamMeetingState) {
  if (team?.archivedAt) {
    throw { code: "TEAM_ARCHIVED" };
  }
  if (team?.project?.module?.archivedAt) {
    throw { code: "MODULE_ARCHIVED" };
  }
  if (team && isProjectCompletedForMeetings(team)) {
    throw { code: "PROJECT_COMPLETED" };
  }
}

async function clearInactivityFlagIfNeeded(team: TeamMeetingState, teamId: number) {
  if (team?.inactivityFlag === "YELLOW") {
    await clearTeamInactivityFlag(teamId);
  }
}

function resolveMeetingRecipients(members: { id: number; email: string }[], participantIds?: number[]) {
  if (!participantIds) {
    return members;
  }
  return members.filter((member) => participantIds.includes(member.id));
}

function buildMeetingUrl(projectId: number | undefined, meetingId: number): string | null {
  if (!projectId) {
    return null;
  }
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${baseUrl}/projects/${projectId}/meetings/${meetingId}`;
}

async function assertUserCanEditMeeting(meeting: MeetingWithDetails, userId: number) {
  if (new Date(meeting.date) < new Date()) {
    throw { code: "MEETING_PASSED" };
  }
  if (meeting.organiserId === userId) {
    return;
  }

  const settings = await getModuleMeetingSettingsForTeam(meeting.teamId);
  const isMember = meeting.team.allocations.some((allocation) => allocation.userId === userId);
  if (!settings.allowAnyoneToEditMeetings || !isMember) {
    throw { code: "FORBIDDEN" };
  }
}

function notifyMeetingUpdated(meeting: MeetingWithDetails, userId: number, meetingId: number, title: string) {
  return Promise.all(
    meeting.participants
      .filter((participant) => participant.userId !== userId)
      .map((participant) =>
        addNotification({
          userId: participant.userId,
          type: "MEETING_UPDATED",
          message: `The meeting "${title}" has been updated`,
          link: `/projects/${meeting.team.projectId}/meetings/${meetingId}`,
        })
      )
  );
}

export async function addMeeting(data: MeetingInput) {
  const { participantIds, ...meetingData } = data;
  const team = await getTeamMeetingState(data.teamId);
  assertTeamCanCreateMeeting(team);

  const meeting = await createMeeting(meetingData);
  await clearInactivityFlagIfNeeded(team, data.teamId);

  const members = await getTeamMembers(data.teamId);
  const recipients = resolveMeetingRecipients(members, participantIds);
  await createParticipants(meeting.id, recipients.map((m) => m.id));
  const meetingUrl = buildMeetingUrl(team?.projectId, meeting.id);
  await notifyMeetingCreated(recipients, {
    organiserId: data.organiserId,
    title: data.title,
    projectId: team?.projectId,
    meetingId: meeting.id,
  });
  await sendMeetingInviteEmails(recipients, data, meetingUrl);
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
  if (!meeting) {
    throw { code: "NOT_FOUND" };
  }
  await assertProjectMutableForWritesByTeamId(meeting.teamId);
  await assertUserCanEditMeeting(meeting, userId);

  const { participantIds, ...meetingData } = data;
  const updated = await updateMeeting(meetingId, meetingData);
  if (participantIds !== undefined) {
    await replaceParticipants(meetingId, participantIds);
  }
  await notifyMeetingUpdated(meeting, userId, meetingId, data.title ?? meeting.title);
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
  if (teamOverrideDueDate) {
    return teamOverrideDueDate;
  }

  const projectDeadline = team.project?.deadline;
  if (!projectDeadline) {
    return null;
  }

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
  if (team.archivedAt || team.project?.archivedAt || team.project?.module?.archivedAt) {
    return true;
  }
  const effectiveDueDate = resolveTeamMeetingFeedbackDueDate(team);
  if (!effectiveDueDate) {
    return false;
  }
  return now.getTime() > effectiveDueDate.getTime();
}