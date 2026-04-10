import { prisma } from "../prismaClient";

export async function clearTeamMeetings(teamId: number) {
  const meetings = await prisma.meeting.findMany({
    where: { teamId },
    select: { id: true },
  });
  if (meetings.length === 0) return 0;

  const meetingIds = meetings.map((meeting) => meeting.id);
  const comments = await prisma.meetingComment.findMany({
    where: { meetingId: { in: meetingIds } },
    select: { id: true },
  });
  const commentIds = comments.map((comment) => comment.id);
  await prisma.mention.deleteMany({
    where: {
      sourceType: "COMMENT",
      sourceId: { in: commentIds },
    },
  });
  await prisma.meetingAttendance.deleteMany({ where: { meetingId: { in: meetingIds } } });
  await prisma.meetingParticipant.deleteMany({ where: { meetingId: { in: meetingIds } } });
  await prisma.meetingMinutes.deleteMany({ where: { meetingId: { in: meetingIds } } });
  await prisma.meetingComment.deleteMany({ where: { meetingId: { in: meetingIds } } });
  await prisma.meeting.deleteMany({ where: { id: { in: meetingIds } } });
  return meetingIds.length;
}

export async function clearPrimaryScenarioWarningsAndMeetings(projectId: number, teamId: number) {
  await prisma.teamWarning.deleteMany({ where: { projectId, teamId } });
  return clearTeamMeetings(teamId);
}
