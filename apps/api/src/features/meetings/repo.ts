import { prisma } from "../../shared/db.js";

const userNameSelect = { id: true, firstName: true, lastName: true } as const;

// CRUD

/** Returns the meetings by team ID. */
export function getMeetingsByTeamId(teamId: number) {
  return prisma.meeting.findMany({
    where: { teamId },
    orderBy: { date: "desc" },
    include: {
      organiser: { select: userNameSelect },
      participants: { include: { user: { select: userNameSelect } } },
      attendances: { include: { user: { select: userNameSelect } } },
      minutes: { include: { writer: { select: userNameSelect } } },
      comments: { include: { user: { select: userNameSelect } } },
      team: {
        select: {
          enterpriseId: true,
          allocations: { include: { user: { select: userNameSelect } } },
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
      organiser: { select: userNameSelect },
      team: {
        include: {
          allocations: { include: { user: { select: userNameSelect } } },
        },
      },
      participants: { include: { user: { select: userNameSelect } } },
      attendances: { include: { user: { select: userNameSelect } } },
      minutes: { include: { writer: { select: userNameSelect } } },
      comments: { include: { user: { select: userNameSelect } } },
    },
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
  return prisma.meeting.create({ data });
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

/** Deletes the meeting. */
export function deleteMeeting(meetingId: number) {
  return prisma.meeting.delete({ where: { id: meetingId } });
}

// Participants

/** Creates participant records for a meeting. */
export function createParticipants(meetingId: number, userIds: number[]) {
  return prisma.meetingParticipant.createMany({
    data: userIds.map((userId) => ({ meetingId, userId })),
    skipDuplicates: true,
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

// Attendance

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

export function getRecentAttendanceForUser(userId: number, teamId: number, limit: number) {
  return prisma.meetingAttendance.findMany({
    where: { userId, meeting: { teamId } },
    orderBy: { meeting: { date: "desc" } },
    take: limit,
    select: { status: true },
  });
}

// Minutes

/** Executes the upsert minutes. */
export function upsertMinutes(meetingId: number, writerId: number, content: string) {
  return prisma.meetingMinutes.upsert({
    where: { meetingId },
    create: { meetingId, writerId, content },
    update: { content },
  });
}

// Comments and Mentions

/** Creates a comment. */
export function createComment(meetingId: number, userId: number, content: string) {
  return prisma.meetingComment.create({
    data: { meetingId, userId, content },
  });
}

/** Deletes the comment. */
export function deleteComment(commentId: number) {
  return prisma.meetingComment.delete({ where: { id: commentId } });
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

// Settings and State

/** Returns team meeting-state fields used by service guards. */
export function getTeamMeetingState(teamId: number) {
  return prisma.team.findUnique({
    where: { id: teamId },
    select: {
      archivedAt: true,
      inactivityFlag: true,
      deadlineProfile: true,
      projectId: true,
      deadlineOverride: { select: { feedbackDueDate: true } },
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

export async function getModuleLeadsForTeam(teamId: number) {
  const moduleId = await getModuleIdForTeam(teamId);
  if (!moduleId) return [];
  return prisma.moduleLead.findMany({
    where: { moduleId },
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

async function getModuleIdForTeam(teamId: number) {
  const project = await prisma.project.findFirst({
    where: { teams: { some: { id: teamId } } },
    select: { moduleId: true },
  });
  return project?.moduleId ?? null;
}
