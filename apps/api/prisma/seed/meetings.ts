import { randSentence } from "@ngneat/falso";
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
  const commentSpecs = [
    { meeting: meetings.weeklyCheckIn, offsetMinutes: 20, authorIndex: 0, mentionIndexes: [] },
    { meeting: meetings.weeklyCheckIn, offsetMinutes: 65, authorIndex: 1, mentionIndexes: [0] },
    { meeting: meetings.uiReview, offsetMinutes: 25, authorIndex: 0, mentionIndexes: [1] },
    { meeting: meetings.uiReview, offsetMinutes: 35, authorIndex: 2, mentionIndexes: [] },
    { meeting: meetings.uiReview, offsetMinutes: 55, authorIndex: 1, mentionIndexes: [0, 2, 3] },
    { meeting: meetings.testingSession, offsetMinutes: 35, authorIndex: 0, mentionIndexes: [1] },
    {
      meeting: { ...meetings.testingSession, title: "Backlog Grooming" },
      offsetMinutes: 45,
      authorIndex: 3,
      mentionIndexes: [0],
    },
  ] as const;

  return commentSpecs.map((spec) => {
    const author = teamStudents[spec.authorIndex % teamStudents.length];
    const mentionedUsers = spec.mentionIndexes
      .map((mentionIndex) => teamStudents[mentionIndex % teamStudents.length])
      .filter((user): user is NamedSeedUser => Boolean(user) && user.id !== author.id)
      .filter((user, position, users) => users.findIndex((candidate) => candidate.id === user.id) === position);

    return {
      meetingId: spec.meeting.id,
      userId: author.id,
      content: buildSeedCommentContent(spec.meeting.title, author, mentionedUsers),
      createdAt: minutesAfter(spec.meeting.date, spec.offsetMinutes),
      mentionedUserIds: mentionedUsers.map((user) => user.id),
    } satisfies SeedCommentPlan;
  });
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
    const team = context.teams[0];
    if (!team) return { value: undefined, rows: 0, details: "skipped (no teams)" };

    const existing = await prisma.meeting.findFirst({ where: { teamId: team.id } });
    if (existing) return { value: undefined, rows: 0, details: "skipped (meetings already seeded)" };

    const teamAllocations = await prisma.teamAllocation.findMany({
      where: { teamId: team.id },
      select: { userId: true },
    });
    const teamMemberIds = new Set(teamAllocations.map((a) => a.userId));
    const teamStudents = context.usersByRole.students.filter(
      (student): student is NamedSeedUser =>
        teamMemberIds.has(student.id) && Boolean(student.firstName?.trim()) && Boolean(student.lastName?.trim())
    );

    if (teamStudents.length < 2) {
      return { value: undefined, rows: 0, details: "skipped (insufficient team students)" };
    }

    const organiser = teamStudents[0];
    const minutesWriter = teamStudents[1];

    const teamIntroData = {
      teamId: team.id,
      organiserId: organiser.id,
      title: "Team Introduction",
      subject: "Getting started",
      date: daysAgo(21),
      location: "Bush House 3.01",
      agenda: "Just a quick first meetup - introduce ourselves, figure out who's doing what and set up a group chat. Also need to agree on what tools we're using and how we'll split the work.",
    };
    const teamIntro = buildSeedMeetingRecord(
      (await prisma.meeting.create({ data: teamIntroData })).id,
      teamIntroData.title,
      teamIntroData.date
    );

    const weeklyCheckInData = {
      teamId: team.id,
      organiserId: organiser.id,
      title: "Weekly Check-in",
      subject: "Progress update",
      date: daysAgo(14),
      location: "King's Building Seminar Room B",
      agenda: "Go through what everyone's been working on this week, flag any blockers and figure out priorities for next week. Shouldn't be too long.",
    };
    const weeklyCheckIn = buildSeedMeetingRecord(
      (await prisma.meeting.create({ data: weeklyCheckInData })).id,
      weeklyCheckInData.title,
      weeklyCheckInData.date
    );

    const uiReviewData = {
      teamId: team.id,
      organiserId: organiser.id,
      title: "UI Review",
      subject: "Frontend designs",
      date: daysAgo(7),
      location: "Waterloo Campus Room 2.03",
      agenda: "Look at the latest frontend stuff together - meeting detail page, the notification bell, attendance table. Want to get everyone's thoughts before we submit.",
    };
    const uiReview = buildSeedMeetingRecord(
      (await prisma.meeting.create({ data: uiReviewData })).id,
      uiReviewData.title,
      uiReviewData.date
    );

    const testingSessionData = {
      teamId: team.id,
      organiserId: organiser.id,
      title: "Testing Session",
      subject: "Test coverage review",
      date: daysAgo(3),
      location: "Bush House 3.01",
      agenda: "Go through test coverage as a team and make sure we're not missing anything critical before submission. Each person should come with a list of what they've tested.",
    };
    const testingSession = buildSeedMeetingRecord(
      (await prisma.meeting.create({ data: testingSessionData })).id,
      testingSessionData.title,
      testingSessionData.date
    );

    const submissionPrepData = {
      teamId: team.id,
      organiserId: organiser.id,
      title: "Submission Prep",
      subject: "Final checks before KCL deadline",
      date: daysFromNow(7),
      videoCallLink: "https://meet.google.com/reg-gie-kcl",
      agenda: "Final run through before we submit - check test coverage, make sure the README is done and go over any last issues. Should be pretty quick if everyone's done their bit.",
    };
    const submissionPrep = buildSeedMeetingRecord(
      (await prisma.meeting.create({ data: submissionPrepData })).id,
      submissionPrepData.title,
      submissionPrepData.date
    );

    const demoRehearsalData = {
      teamId: team.id,
      organiserId: organiser.id,
      title: "Demo Rehearsal",
      subject: "End-to-end walkthrough",
      date: daysFromNow(14),
      location: "Bush House 4.02",
      agenda: "Run through the full demo as a team before the presentation. Everyone should know which part they're presenting. Bring questions.",
    };
    const demoRehearsal = buildSeedMeetingRecord(
      (await prisma.meeting.create({ data: demoRehearsalData })).id,
      demoRehearsalData.title,
      demoRehearsalData.date
    );

    const pastMeetings = [testingSession, uiReview, weeklyCheckIn, teamIntro];
    const attendanceRows = pastMeetings.flatMap((meeting, position) => {
      const presentIds = teamStudents.filter((_, i) => i <= position).map((s) => s.id);
      const absentIds = teamStudents.filter((_, i) => i > position).map((s) => s.id);
      return buildAttendanceRows(meeting.id, presentIds, absentIds);
    });

    await prisma.meetingAttendance.createMany({ data: attendanceRows, skipDuplicates: true });

    const allMeetingIds = [teamIntro.id, weeklyCheckIn.id, uiReview.id, testingSession.id, submissionPrep.id, demoRehearsal.id];
    const participantRows = allMeetingIds.flatMap((meetingId) =>
      teamAllocations.map(({ userId }) => ({ meetingId, userId }))
    );

    await prisma.meetingParticipant.createMany({ data: participantRows, skipDuplicates: true });

    await prisma.meetingMinutes.createMany({
      data: [
        {
          meetingId: weeklyCheckIn.id,
          writerId: minutesWriter.id,
          content: buildMinutesContent(
            "Most of the team on track. Backend auth is done, frontend still in progress. Two members flagged they're running behind - agreed to pair up this week to get back on schedule. Next meeting we'll do a proper review of what's been merged."
          ),
        },
        {
          meetingId: uiReview.id,
          writerId: minutesWriter.id,
          content: buildMinutesContent(
            "Went through the frontend changes - everyone happy with the compact calendar button in the meeting header. Sorted the attendance table column width. Agreed on using the notebook icon for minutes links. Need to merge the meetings branch before the deadline."
          ),
        },
      ],
    });

    const commentPlans = buildSeedMeetingComments({ weeklyCheckIn, uiReview, testingSession }, teamStudents);
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

      for (const userId of plan.mentionedUserIds) {
        mentionRows.push({
          userId,
          sourceType: "COMMENT",
          sourceId: createdComment.id,
        });
      }
    }

    if (mentionRows.length > 0) {
      await prisma.mention.createMany({ data: mentionRows, skipDuplicates: true });
    }

    return {
      value: undefined,
      rows: 6 + commentPlans.length,
      details: `team=${team.id}, 4 past + 2 upcoming, ${teamStudents.length} participants, comments=${commentPlans.length}, mentions=${mentionRows.length}`,
    };
  });
}
