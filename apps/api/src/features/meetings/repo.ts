import { prisma } from "../../shared/db.js";

export function getMeetingsByTeamId(teamId: number) {
  return prisma.meeting.findMany({
    where: { teamId },
    orderBy: { date: "desc" },
    include: {
      organiser: {
        select: { id: true, firstName: true, lastName: true },
      },
      attendances: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      minutes: true,
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

export function getMeetingById(meetingId: number) {
  return prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      organiser: {
        select: { id: true, firstName: true, lastName: true },
      },
      attendances: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      minutes: true,
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

export function createMeeting(data: {
  teamId: number;
  organiserId: number;
  title: string;
  date: Date;
  subject?: string;
  location?: string;
  agenda?: string;
}) {
  return prisma.meeting.create({
    data,
  });
}

export function deleteMeeting(meetingId: number) {
  return prisma.meeting.delete({
    where: { id: meetingId },
  });
}

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

export function upsertMinutes(meetingId: number, writerId: number, content: string) {
  return prisma.meetingMinutes.upsert({
    where: { meetingId },
    create: { meetingId, writerId, content },
    update: { content },
  });
}

export function createComment(meetingId: number, userId: number, content: string) {
  return prisma.meetingComment.create({
    data: { meetingId, userId, content },
  });
}

export function deleteComment(commentId: number) {
  return prisma.meetingComment.delete({
    where: { id: commentId },
  });
}
