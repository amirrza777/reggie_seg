import { prisma } from "../../shared/db.js";

/** Returns the meetings by team ID. */
export function getMeetingsByTeamId(teamId: number) {
  return prisma.meeting.findMany({
    where: { teamId },
    orderBy: { date: "desc" },
    include: {
      organiser: {
        select: { id: true, firstName: true, lastName: true },
      },
      participants: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      attendances: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      minutes: {
        include: {
          writer: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      comments: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      team: {
        select: {
          enterpriseId: true,
          allocations: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      },
    },
  });
}

/** Returns the meeting by ID. */
export function getMeetingById(meetingId: number) {
  return prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      organiser: {
        select: { id: true, firstName: true, lastName: true },
      },
      team: {
        include: {
          allocations: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      },
      participants: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      attendances: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      minutes: {
        include: {
          writer: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      comments: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });
}

/** Creates participant records for a meeting. */
export function createParticipants(meetingId: number, userIds: number[]) {
  return prisma.meetingParticipant.createMany({
    data: userIds.map((userId) => ({ meetingId, userId })),
    skipDuplicates: true,
  });
}

/** Creates a meeting. */
export function createMeeting(data: {
  teamId: number;
  organiserId: number;
  title: string;
  date: Date;
  subject?: string;
  location?: string;
  videoCallLink?: string;
  agenda?: string;
}) {
  return prisma.meeting.create({
    data,
  });
}

export function updateMeeting(meetingId: number, data: {
  title?: string;
  date?: Date;
  subject?: string;
  location?: string;
  videoCallLink?: string;
  agenda?: string;
}) {
  return prisma.meeting.update({ where: { id: meetingId }, data });
}

/** Returns team meeting-state fields used by service guards. */
export function getTeamMeetingState(teamId: number) {
  return prisma.team.findUnique({
    where: { id: teamId },
    select: {
      archivedAt: true,
      inactivityFlag: true,
      deadlineProfile: true,
      deadlineOverride: {
        select: {
          feedbackDueDate: true,
        },
      },
      project: {
        select: {
          archivedAt: true,
          deadline: {
            select: {
              feedbackDueDate: true,
              feedbackDueDateMcf: true,
            },
          },
        },
      },
    },
  });
}

/** Clears inactivity flag for a team after a new meeting. */
export function clearTeamInactivityFlag(teamId: number) {
  return prisma.team.update({
    where: { id: teamId },
    data: { inactivityFlag: "NONE" },
  });
}

/** Replaces all participants for a meeting. */
export function replaceParticipants(meetingId: number, participantIds: number[]) {
  return prisma.$transaction([
    prisma.meetingParticipant.deleteMany({ where: { meetingId } }),
    prisma.meetingParticipant.createMany({
      data: participantIds.map((userId) => ({ meetingId, userId })),
    }),
  ]);
}

/** Deletes the meeting. */
export function deleteMeeting(meetingId: number) {
  return prisma.meeting.delete({
    where: { id: meetingId },
  });
}

/** Executes the bulk upsert attendance. */
export function bulkUpsertAttendance(
  meetingId: number,
  records: { userId: number; status: string }[]
) {
  const upserts = records.map((record) =>
    prisma.meetingAttendance.upsert({
      where: {
        meetingId_userId: {
          meetingId,
          userId: record.userId,
        },
      },
      create: {
        meetingId,
        userId: record.userId,
        status: record.status,
      },
      update: {
        status: record.status,
      },
    })
  );
  return prisma.$transaction(upserts);
}

/** Executes the upsert minutes. */
export function upsertMinutes(meetingId: number, writerId: number, content: string) {
  return prisma.meetingMinutes.upsert({
    where: { meetingId },
    create: { meetingId, writerId, content },
    update: { content },
  });
}

/** Creates a comment. */
export function createComment(meetingId: number, userId: number, content: string, _teamId?: number) {
  return prisma.meetingComment.create({
    data: { meetingId, userId, content },
  });
}

/** Deletes the comment. */
export function deleteComment(commentId: number) {
  return prisma.meetingComment.delete({
    where: { id: commentId },
  });
}

export function createMentions(sourceId: number, userIds: number[]) {
  return prisma.mention.createMany({
    data: userIds.map((userId) => ({
      userId,
      sourceType: "COMMENT",
      sourceId,
    })),
    skipDuplicates: true,
  });
}

export function getRecentAttendanceForUser(userId: number, teamId: number, limit: number) {
  return prisma.meetingAttendance.findMany({
    where: { userId, meeting: { teamId } },
    orderBy: { meeting: { date: "desc" } },
    take: limit,
    select: { status: true },
  });
}

export async function getModuleLeadsForTeam(teamId: number) {
  const project = await prisma.project.findFirst({
    where: { teams: { some: { id: teamId } } },
    select: { moduleId: true },
  });
  if (!project) return [];
  return prisma.moduleLead.findMany({
    where: { moduleId: project.moduleId },
    select: { userId: true },
  });
}

export async function getModuleMeetingSettingsForTeam(teamId: number) {
  const project = await prisma.project.findFirst({
    where: { teams: { some: { id: teamId } } },
    select: {
      module: {
        select: {
          absenceThreshold: true,
          minutesEditWindowDays: true,
          attendanceEditWindowDays: true,
          allowAnyoneToEditMeetings: true,
          allowAnyoneToRecordAttendance: true,
          allowAnyoneToWriteMinutes: true,
        },
      },
    },
  });
  return project?.module ?? {
    absenceThreshold: 3,
    minutesEditWindowDays: 7,
    attendanceEditWindowDays: 7,
    allowAnyoneToEditMeetings: false,
    allowAnyoneToRecordAttendance: false,
    allowAnyoneToWriteMinutes: false,
  };
}
