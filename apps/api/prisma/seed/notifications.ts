import type { NotificationType } from "@prisma/client";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedContext } from "./types";

export async function seedNotifications(context: SeedContext) {
  return withSeedLogging("seedNotifications", async () => {
    const target = getNotificationSeedTarget(context);
    if (!target.ready) return target.result;

    const existing = await prisma.notification.findFirst({ where: { userId: target.student.id } });
    if (existing) return { value: undefined, rows: 0, details: "skipped (notifications already seeded)" };

    const meetings = await findTeamMeetings(target.team.id);
    const notifications = [
      ...buildStudentNotifications(target.student.id, target.projectId, meetings),
      ...buildStaffNotifications(target.staff?.id, target.projectId, target.team.id),
    ];
    const result = await createSeedNotifications(notifications);

    return {
      value: undefined,
      rows: result.count,
      details: `student=${target.student.id}, staff=${target.staff?.id ?? "none"}, project=${target.projectId}`,
    };
  });
}

type SeedNotificationRow = {
  userId: number;
  type: NotificationType;
  message: string;
  link: string;
  read: boolean;
};

async function createSeedNotifications(data: SeedNotificationRow[]) {
  try {
    return await prisma.notification.createMany({ data });
  } catch (error) {
    if (!isLegacyNotificationTypeError(error)) {
      throw error;
    }

    const fallbackData = data.map((notification) => ({
      ...notification,
      type: mapLegacyNotificationType(notification.type),
    }));

    return prisma.notification.createMany({ data: fallbackData });
  }
}

function mapLegacyNotificationType(type: NotificationType): NotificationType {
  switch (type) {
    case "MEETING_CREATED":
    case "MEETING_DELETED":
    case "MEETING_UPDATED":
    case "DEADLINE_OVERRIDE_GRANTED":
    case "TEAM_HEALTH_SUBMITTED":
    case "FORUM_REPLY":
    case "FORUM_REPORTED":
      return "MENTION";
    default:
      return type;
  }
}

function isLegacyNotificationTypeError(error: unknown) {
  const message = (error as { message?: string })?.message ?? "";
  return message.includes("Data truncated for column 'type'");
}

function getNotificationSeedTarget(context: SeedContext) {
  const team = context.teams[0];
  if (!team) return { ready: false as const, result: { value: undefined, rows: 0, details: "skipped (no teams)" } };

  const { students, adminOrStaff } = context.usersByRole;
  if (students.length < 2) {
    return { ready: false as const, result: { value: undefined, rows: 0, details: "skipped (insufficient students)" } };
  }

  const student = students[0]!;

  return {
    ready: true as const,
    team,
    student,
    staff: adminOrStaff[0],
    projectId: team.projectId,
  };
}

function findTeamMeetings(teamId: number) {
  return prisma.meeting.findMany({
    where: { teamId },
    select: { id: true, title: true, date: true },
  });
}

function buildStudentNotifications(
  studentId: number,
  projectId: number,
  meetings: Awaited<ReturnType<typeof findTeamMeetings>>
): SeedNotificationRow[] {
  const now = new Date();
  const upcomingMeeting = meetings.find((meeting) => meeting.date > now);
  const pastMeeting = meetings.find((meeting) => meeting.date < now);
  return [
    ...buildPastMeetingNotifications(studentId, projectId, pastMeeting),
    ...buildUpcomingMeetingNotifications(studentId, projectId, upcomingMeeting),
    {
      userId: studentId,
      type: "DEADLINE_OVERRIDE_GRANTED",
      message: "Your deadline has been updated by a staff member",
      link: `/projects/${projectId}/deadlines`,
      read: false,
    },
    {
      userId: studentId,
      type: "FORUM_REPLY",
      message: "Someone replied to your forum post",
      link: `/projects/${projectId}/discussion`,
      read: false,
    },
  ];
}

function buildPastMeetingNotifications(
  studentId: number,
  projectId: number,
  meeting: Awaited<ReturnType<typeof findTeamMeetings>>[number] | undefined
): SeedNotificationRow[] {
  if (!meeting) return [];
  return [
    {
      userId: studentId,
      type: "MEETING_CREATED",
      message: `A new meeting has been scheduled: ${meeting.title}`,
      link: `/projects/${projectId}/meetings/${meeting.id}`,
      read: true,
    },
  ];
}

function buildUpcomingMeetingNotifications(
  studentId: number,
  projectId: number,
  meeting: Awaited<ReturnType<typeof findTeamMeetings>>[number] | undefined
): SeedNotificationRow[] {
  if (!meeting) return [];
  return [
    {
      userId: studentId,
      type: "MEETING_CREATED",
      message: `A new meeting has been scheduled: ${meeting.title}`,
      link: `/projects/${projectId}/meetings/${meeting.id}`,
      read: false,
    },
    {
      userId: studentId,
      type: "MEETING_UPDATED",
      message: `The meeting "${meeting.title}" has been updated`,
      link: `/projects/${projectId}/meetings/${meeting.id}`,
      read: false,
    },
    {
      userId: studentId,
      type: "MENTION",
      message: "Someone mentioned you in a comment",
      link: `/projects/${projectId}/meetings/${meeting.id}`,
      read: false,
    },
  ];
}

function buildStaffNotifications(staffId: number | undefined, projectId: number, teamId: number): SeedNotificationRow[] {
  if (!staffId) return [];
  return [
    {
      userId: staffId,
      type: "LOW_ATTENDANCE",
      message: "A student has missed their last 3 meetings",
      link: `/staff/projects/${projectId}/teams/${teamId}/team-meetings`,
      read: false,
    },
    {
      userId: staffId,
      type: "TEAM_HEALTH_SUBMITTED",
      message: "A team health message has been submitted",
      link: `/staff/projects/${projectId}/teams/${teamId}/teamhealth`,
      read: false,
    },
    {
      userId: staffId,
      type: "FORUM_REPORTED",
      message: "A forum post has been reported",
      link: `/staff/projects/${projectId}/discussion`,
      read: false,
    },
  ];
}
