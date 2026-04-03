import { randSentence } from "@ngneat/falso";
import { buildMeetingDefinitions, type MeetingInput } from "./meetings/definitions";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedContext, SeedUser } from "./types";

type SeedMeetingRecord = {
  id: number;
  title: string;
  date: Date;
};

type SeedCommentPlan = {
  meetingId: number;
  userId: number;
  content: string;
  createdAt: Date;
  mentionedUserIds: number[];
};

type NamedSeedUser = SeedUser & {
  firstName: string;
  lastName: string;
};

type SeedMeetingSet = {
  teamIntro: SeedMeetingRecord;
  weeklyCheckIn: SeedMeetingRecord;
  uiReview: SeedMeetingRecord;
  testingSession: SeedMeetingRecord;
  submissionPrep: SeedMeetingRecord;
  demoRehearsal: SeedMeetingRecord;
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function buildMinutesContent(text: string): string {
  return JSON.stringify({
    root: {
      children: [
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text,
              type: "text",
              version: 1,
            },
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "paragraph",
          version: 1,
        },
      ],
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });
}

function buildAttendanceRows(
  meetingId: number,
  presentIds: number[],
  absentIds: number[]
) {
  return [
    ...presentIds.map((userId) => ({ meetingId, userId, status: "on_time" })),
    ...absentIds.map((userId) => ({ meetingId, userId, status: "absent" })),
  ];
}

function buildSeedMeetingRecord(id: number, title: string, date: Date): SeedMeetingRecord {
  return { id, title, date };
}

function buildSeedMeetingComments(meetings: {
  weeklyCheckIn: SeedMeetingRecord;
  uiReview: SeedMeetingRecord;
  testingSession: SeedMeetingRecord;
}, teamStudents: NamedSeedUser[]) {
  return getCommentSpecs(meetings).map((spec) => buildCommentPlan(spec, teamStudents));
}

function buildSeedCommentContent(
  meetingTitle: string,
  author: NamedSeedUser,
  mentionedUsers: NamedSeedUser[]
) {
  const variation = normalizeSentence(randSentence());
  const mentionText = formatMentionNames(mentionedUsers);
  const normalizedMeetingTitle = meetingTitle.toLowerCase();

  if (normalizedMeetingTitle === "weekly check-in" && mentionedUsers.length === 0) {
    return `I've pushed the follow-up updates from the weekly check-in and tightened the task notes so the next review is easier to follow. ${variation}`;
  }

  if (normalizedMeetingTitle === "weekly check-in") {
    return `${mentionText} could you take the next action from the weekly check-in? I've already updated the notes and the branch summary from today's discussion. ${variation}`;
  }

  if (normalizedMeetingTitle === "ui review" && mentionedUsers.length === 0) {
    return `I've tidied the UI feedback from the ui review and documented the spacing issues we agreed to fix before merge. ${variation}`;
  }

  if (normalizedMeetingTitle === "ui review") {
    return `${mentionText} please check the remaining review points from the ui review so we can close the outstanding items before the next handover. ${variation}`;
  }

  if (normalizedMeetingTitle === "testing session") {
    return `${mentionText} can you take the test failures from the testing session before tomorrow? I've already linked the failing cases to the notes from today's session. ${variation}`;
  }

  return `${author.firstName} noted the follow-up from ${normalizedMeetingTitle} and asked the team to keep the action list moving. ${variation}`;
}

function formatMentionNames(users: NamedSeedUser[]) {
  if (users.length === 0) return "";
  if (users.length === 1) return `@${users[0].firstName} ${users[0].lastName}`;
  if (users.length === 2) return `@${users[0].firstName} ${users[0].lastName} and @${users[1].firstName} ${users[1].lastName}`;

  const leading = users
    .slice(0, -1)
    .map((user) => `@${user.firstName} ${user.lastName}`)
    .join(", ");
  const last = users[users.length - 1];
  return `${leading}, and @${last.firstName} ${last.lastName}`;
}

function minutesAfter(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function normalizeSentence(value: string | string[]) {
  const text = Array.isArray(value) ? value.join(" ") : value;
  return text.replace(/\s+/g, " ").trim();
}

export async function seedMeetings(context: SeedContext) {
  return withSeedLogging("seedMeetings", async () => {
    const ready = await getMeetingSeedReadiness(context);
    if (!ready.ready) return ready.result;

    const teamStudents = resolveTeamStudents(context, ready.teamAllocations);
    if (teamStudents.length < 2) return { value: undefined, rows: 0, details: "skipped (insufficient team students)" };

    const organiser = teamStudents[0]!;
    const minutesWriter = teamStudents[1]!;

    const meetings = await createSeedMeetings(ready.team.id, organiser.id);
    await seedMeetingAttendance(meetings, teamStudents);
    await seedMeetingParticipants(meetings, ready.teamAllocations);
    await seedMeetingMinutes(meetings, minutesWriter.id);
    const commentPlans = buildSeedMeetingComments(meetings, teamStudents);
    const mentionRows = await seedMeetingCommentsAndMentions(commentPlans);

    return {
      value: undefined,
      rows: 6 + commentPlans.length,
      details: `team=${ready.team.id}, 4 past + 2 upcoming, ${teamStudents.length} participants, comments=${commentPlans.length}, mentions=${mentionRows.length}`,
    };
  });
}

function getCommentSpecs(meetings: {
  weeklyCheckIn: SeedMeetingRecord;
  uiReview: SeedMeetingRecord;
  testingSession: SeedMeetingRecord;
}) {
  return [
    { meeting: meetings.weeklyCheckIn, offsetMinutes: 20, authorIndex: 0, mentionIndexes: [] },
    { meeting: meetings.weeklyCheckIn, offsetMinutes: 65, authorIndex: 1, mentionIndexes: [0] },
    { meeting: meetings.uiReview, offsetMinutes: 25, authorIndex: 0, mentionIndexes: [1] },
    { meeting: meetings.uiReview, offsetMinutes: 35, authorIndex: 2, mentionIndexes: [] },
    { meeting: meetings.uiReview, offsetMinutes: 55, authorIndex: 1, mentionIndexes: [0, 2, 3] },
    { meeting: meetings.testingSession, offsetMinutes: 35, authorIndex: 0, mentionIndexes: [1] },
    { meeting: { ...meetings.testingSession, title: "Backlog Grooming" }, offsetMinutes: 45, authorIndex: 3, mentionIndexes: [0] },
  ] as const;
}

function buildCommentPlan(
  spec: ReturnType<typeof getCommentSpecs>[number],
  teamStudents: NamedSeedUser[]
) {
  const author = teamStudents[spec.authorIndex % teamStudents.length];
  const mentionedUsers = resolveMentionedUsers(spec.mentionIndexes, teamStudents, author.id);
  return {
    meetingId: spec.meeting.id,
    userId: author.id,
    content: buildSeedCommentContent(spec.meeting.title, author, mentionedUsers),
    createdAt: minutesAfter(spec.meeting.date, spec.offsetMinutes),
    mentionedUserIds: mentionedUsers.map((user) => user.id),
  } satisfies SeedCommentPlan;
}

function resolveMentionedUsers(mentionIndexes: readonly number[], teamStudents: NamedSeedUser[], authorId: number) {
  return mentionIndexes
    .map((mentionIndex) => teamStudents[mentionIndex % teamStudents.length])
    .filter((user): user is NamedSeedUser => Boolean(user) && user.id !== authorId)
    .filter((user, position, users) => users.findIndex((candidate) => candidate.id === user.id) === position);
}

async function getMeetingSeedReadiness(context: SeedContext) {
  const team = context.teams[0];
  if (!team) return { ready: false as const, result: { value: undefined, rows: 0, details: "skipped (no teams)" } };

  const existing = await prisma.meeting.findFirst({ where: { teamId: team.id } });
  if (existing) return { ready: false as const, result: { value: undefined, rows: 0, details: "skipped (meetings already seeded)" } };

  const teamAllocations = await prisma.teamAllocation.findMany({
    where: { teamId: team.id },
    select: { userId: true },
  });
  return { ready: true as const, team, teamAllocations };
}

function resolveTeamStudents(context: SeedContext, teamAllocations: { userId: number }[]) {
  const teamMemberIds = new Set(teamAllocations.map((allocation) => allocation.userId));
  return context.usersByRole.students.filter(
    (student): student is NamedSeedUser =>
      teamMemberIds.has(student.id) && Boolean(student.firstName?.trim()) && Boolean(student.lastName?.trim())
  );
}

async function createSeedMeetings(teamId: number, organiserId: number): Promise<SeedMeetingSet> {
  const definitions = buildMeetingDefinitions({ daysAgo, daysFromNow });
  const teamIntro = await createSeedMeeting(teamId, organiserId, definitions.teamIntro);
  const weeklyCheckIn = await createSeedMeeting(teamId, organiserId, definitions.weeklyCheckIn);
  const uiReview = await createSeedMeeting(teamId, organiserId, definitions.uiReview);
  const testingSession = await createSeedMeeting(teamId, organiserId, definitions.testingSession);
  const submissionPrep = await createSeedMeeting(teamId, organiserId, definitions.submissionPrep);
  const demoRehearsal = await createSeedMeeting(teamId, organiserId, definitions.demoRehearsal);
  return { teamIntro, weeklyCheckIn, uiReview, testingSession, submissionPrep, demoRehearsal };
}

async function createSeedMeeting(teamId: number, organiserId: number, input: MeetingInput) {
  const created = await prisma.meeting.create({
    data: {
      teamId,
      organiserId,
      title: input.title,
      subject: input.subject,
      date: input.date,
      location: input.location,
      videoCallLink: input.videoCallLink,
      agenda: input.agenda,
    },
  });
  return buildSeedMeetingRecord(created.id, input.title, input.date);
}

function seedMeetingAttendance(meetings: SeedMeetingSet, teamStudents: NamedSeedUser[]) {
  const pastMeetings = [meetings.testingSession, meetings.uiReview, meetings.weeklyCheckIn, meetings.teamIntro];
  const rows = pastMeetings.flatMap((meeting, position) => buildAttendanceRowsForMeeting(meeting.id, teamStudents, position));
  return prisma.meetingAttendance.createMany({ data: rows, skipDuplicates: true });
}

function buildAttendanceRowsForMeeting(meetingId: number, teamStudents: NamedSeedUser[], position: number) {
  const presentIds = teamStudents.filter((_, index) => index <= position).map((student) => student.id);
  const absentIds = teamStudents.filter((_, index) => index > position).map((student) => student.id);
  return buildAttendanceRows(meetingId, presentIds, absentIds);
}

function seedMeetingParticipants(meetings: SeedMeetingSet, allocations: { userId: number }[]) {
  const allMeetingIds = Object.values(meetings).map((meeting) => meeting.id);
  const rows = allMeetingIds.flatMap((meetingId) => allocations.map(({ userId }) => ({ meetingId, userId })));
  return prisma.meetingParticipant.createMany({ data: rows, skipDuplicates: true });
}

function seedMeetingMinutes(meetings: SeedMeetingSet, writerId: number) {
  return prisma.meetingMinutes.createMany({
    data: [
      {
        meetingId: meetings.weeklyCheckIn.id,
        writerId,
        content: buildMinutesContent(
          "Most of the team on track. Backend auth is done, frontend still in progress. Two members flagged they're running behind - agreed to pair up this week to get back on schedule. Next meeting we'll do a proper review of what's been merged."
        ),
      },
      {
        meetingId: meetings.uiReview.id,
        writerId,
        content: buildMinutesContent(
          "Went through the frontend changes - everyone happy with the compact calendar button in the meeting header. Sorted the attendance table column width. Agreed on using the notebook icon for minutes links. Need to merge the meetings branch before the deadline."
        ),
      },
    ],
  });
}

async function seedMeetingCommentsAndMentions(commentPlans: SeedCommentPlan[]) {
  const mentionRows: Array<{ userId: number; sourceType: "COMMENT"; sourceId: number }> = [];
  for (const plan of commentPlans) {
    const createdComment = await prisma.meetingComment.create({
      data: {
        meetingId: plan.meetingId,
        userId: plan.userId,
        content: plan.content,
        createdAt: plan.createdAt,
      },
    });
    mentionRows.push(...plan.mentionedUserIds.map((userId) => ({ userId, sourceType: "COMMENT" as const, sourceId: createdComment.id })));
  }
  if (mentionRows.length > 0) await prisma.mention.createMany({ data: mentionRows, skipDuplicates: true });
  return mentionRows;
}
