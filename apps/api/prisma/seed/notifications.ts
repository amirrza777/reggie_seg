import type { NotificationType } from "@prisma/client";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedContext } from "./types";

export async function seedNotifications(context: SeedContext) {
  return withSeedLogging("seedNotifications", async () => {
    const team = context.teams[0];
    if (!team) return { value: undefined, rows: 0, details: "skipped (no teams)" };

    const { students, adminOrStaff } = context.usersByRole;
    if (students.length < 2) return { value: undefined, rows: 0, details: "skipped (insufficient students)" };

    const existing = await prisma.notification.findFirst({ where: { userId: students[0].id } });
    if (existing) return { value: undefined, rows: 0, details: "skipped (notifications already seeded)" };

    const projectId = team.projectId;
    const student = students[0];
    const staff = adminOrStaff[0];

    const meetings = await prisma.meeting.findMany({
      where: { teamId: team.id },
      select: { id: true, title: true, date: true },
    });

    const upcomingMeeting = meetings.find((m) => m.date > new Date());
    const pastMeeting = meetings.find((m) => m.date < new Date());

    const studentNotifications = [
      ...(pastMeeting
        ? [
            {
              userId: student.id,
              type: "MEETING_CREATED" as const,
              message: `A new meeting has been scheduled: ${pastMeeting.title}`,
              link: `/projects/${projectId}/meetings/${pastMeeting.id}`,
              read: true,
            },
          ]
        : []),
      ...(upcomingMeeting
        ? [
            {
              userId: student.id,
              type: "MEETING_CREATED" as const,
              message: `A new meeting has been scheduled: ${upcomingMeeting.title}`,
              link: `/projects/${projectId}/meetings/${upcomingMeeting.id}`,
              read: false,
            },
            {
              userId: student.id,
              type: "MEETING_UPDATED" as const,
              message: `The meeting "${upcomingMeeting.title}" has been updated`,
              link: `/projects/${projectId}/meetings/${upcomingMeeting.id}`,
              read: false,
            },
            {
              userId: student.id,
              type: "MENTION" as const,
              message: "Someone mentioned you in a comment",
              link: `/projects/${projectId}/meetings/${upcomingMeeting.id}`,
              read: false,
            },
          ]
        : []),
      {
        userId: student.id,
        type: "DEADLINE_OVERRIDE_GRANTED" as const,
        message: "Your deadline has been updated by a staff member",
        link: `/projects/${projectId}/deadlines`,
        read: false,
      },
      {
        userId: student.id,
        type: "FORUM_REPLY" as const,
        message: "Someone replied to your forum post",
        link: `/projects/${projectId}/discussion`,
        read: false,
      },
    ];

    const staffNotifications = staff
      ? [
          {
            userId: staff.id,
            type: "LOW_ATTENDANCE" as const,
            message: "A student has missed their last 3 meetings",
            link: `/staff/projects/${projectId}/teams/${team.id}/team-meetings`,
            read: false,
          },
          {
            userId: staff.id,
            type: "TEAM_HEALTH_SUBMITTED" as const,
            message: "A team health message has been submitted",
            link: `/staff/projects/${projectId}/teams/${team.id}/teamhealth`,
            read: false,
          },
          {
            userId: staff.id,
            type: "FORUM_REPORTED" as const,
            message: "A forum post has been reported",
            link: `/staff/projects/${projectId}/discussion`,
            read: false,
          },
        ]
      : [];

    const notifications = [...studentNotifications, ...staffNotifications];
    const result = await createSeedNotifications(notifications);

    return {
      value: undefined,
      rows: result.count,
      details: `student=${student.id}, staff=${staff?.id ?? "none"}, project=${projectId}`,
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
