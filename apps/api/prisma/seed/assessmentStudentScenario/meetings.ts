import { prisma } from "../prismaClient";
import { seedScenarioPastAndUpcomingMeetings } from "../scenarioMeetings";
import type { AssessmentStudentScenarioProject } from "./setup";

export async function seedAssessmentStudentMeetings(projects: AssessmentStudentScenarioProject[], memberIds: number[]) {
  let meetings = 0;
  let comments = 0;
  let mentions = 0;
  for (const project of projects) {
    const seeded = await seedProjectMeetings(project, memberIds);
    meetings += seeded.meetings;
    comments += seeded.comments;
    mentions += seeded.mentions;
  }
  return { meetings, comments, mentions };
}

async function seedProjectMeetings(project: AssessmentStudentScenarioProject, memberIds: number[]) {
  await normalizeLegacySeedMeetingTitles(project.teamId);
  const seeded = await seedScenarioPastAndUpcomingMeetings({
    teamId: project.teamId,
    organiserId: memberIds[0]!,
    memberIds,
    titlePrefix: `Assessment Student ${project.teamName}`,
    seedPastAttendance: project.state !== "upcoming",
    seedPastMinutes: project.state !== "upcoming",
  });
  const commentSeed = await seedProjectMeetingComments(project.teamId, memberIds);
  return { meetings: seeded.total, comments: commentSeed.comments, mentions: commentSeed.mentions };
}

async function normalizeLegacySeedMeetingTitles(teamId: number) {
  const legacyMeetings = await prisma.meeting.findMany({
    where: { teamId, title: { contains: "[SEED]" } },
    select: { id: true, title: true },
  });
  for (const meeting of legacyMeetings) {
    if (typeof meeting.title !== "string") continue;
    const normalizedTitle = meeting.title.replace(/\[SEED\]\s*/g, "").trim();
    if (!normalizedTitle || normalizedTitle === meeting.title) continue;
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { title: normalizedTitle },
    });
  }
}

async function seedProjectMeetingComments(teamId: number, memberIds: number[]) {
  const meetings = await prisma.meeting.findMany({ where: { teamId }, orderBy: { date: "asc" }, select: { id: true, date: true } });
  const pastMeetings = meetings.filter((meeting) => meeting.date.getTime() <= Date.now()).slice(0, 2);
  let comments = 0;
  let mentions = 0;
  for (const meeting of pastMeetings) {
    const seeded = await upsertCommentWithMention(meeting.id, memberIds);
    comments += seeded.comments;
    mentions += seeded.mentions;
  }
  return { comments, mentions };
}

async function upsertCommentWithMention(meetingId: number, memberIds: number[]) {
  const authorId = memberIds[0];
  const mentionedId = memberIds[1];
  if (!authorId || !mentionedId) return { comments: 0, mentions: 0 };
  await prisma.meetingComment.deleteMany({ where: { meetingId, userId: authorId } });
  const comment = await prisma.meetingComment.create({
    data: {
      meetingId,
      userId: authorId,
      content: `@student ${mentionedId} please check the seeded assessment scenario action points before the next milestone.`,
      createdAt: new Date(),
    },
    select: { id: true },
  });
  await prisma.mention.upsert({
    where: { sourceType_sourceId_userId: { sourceType: "COMMENT", sourceId: comment.id, userId: mentionedId } },
    update: {},
    create: { sourceType: "COMMENT", sourceId: comment.id, userId: mentionedId },
  });
  return { comments: 1, mentions: 1 };
}
