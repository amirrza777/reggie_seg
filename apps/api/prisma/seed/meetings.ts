import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedContext } from "./types";

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

function buildAttendanceData(
  meetingId: number,
  presentIds: number[],
  absentIds: number[]
) {
  return [
    ...presentIds.map((userId) => ({ meetingId, userId, status: "on_time" })),
    ...absentIds.map((userId) => ({ meetingId, userId, status: "absent" })),
  ];
}

export async function seedMeetings(context: SeedContext) {
  return withSeedLogging("seedMeetings", async () => {
    const team = context.teams[0];
    const students = context.usersByRole.students;

    if (!team || students.length < 4) {
      return { value: undefined, rows: 0, details: "skipped (insufficient teams/students)" };
    }

    const existing = await prisma.meeting.findFirst({ where: { teamId: team.id } });
    if (existing) {
      return { value: undefined, rows: 0, details: "skipped (meetings already seeded)" };
    }

    const organiser = students[0];
    const minutesWriter = students[1];

    if (!organiser || !minutesWriter) {
      return { value: undefined, rows: 0, details: "skipped (missing organiser/writer)" };
    }

    const presentIds = [organiser.id, minutesWriter.id];
    const absentIds = students.slice(2, 4).map((s) => s.id);

    const teamIntro = await prisma.meeting.create({
      data: {
        teamId: team.id,
        organiserId: organiser.id,
        title: "Team Introduction",
        subject: "Getting started",
        date: daysAgo(21),
        location: "Bush House 3.01",
        agenda: "Just a quick first meetup - introduce ourselves, figure out who's doing what and set up a group chat. Also need to agree on what tools we're using and how we'll split the work.",
      },
    });

    const weeklyCheckIn = await prisma.meeting.create({
      data: {
        teamId: team.id,
        organiserId: organiser.id,
        title: "Weekly Check-in",
        subject: "Progress update",
        date: daysAgo(14),
        location: "King's Building Seminar Room B",
        agenda: "Go through what everyone's been working on this week, flag any blockers and figure out priorities for next week. Shouldn't be too long.",
      },
    });

    const uiReview = await prisma.meeting.create({
      data: {
        teamId: team.id,
        organiserId: organiser.id,
        title: "UI Review",
        subject: "Frontend designs",
        date: daysAgo(7),
        location: "Waterloo Campus Room 2.03",
        agenda: "Look at the latest frontend stuff together - meeting detail page, the notification bell, attendance table. Want to get everyone's thoughts before we submit.",
      },
    });

    const testingSession = await prisma.meeting.create({
      data: {
        teamId: team.id,
        organiserId: organiser.id,
        title: "Testing Session",
        subject: "Test coverage review",
        date: daysAgo(3),
        location: "Bush House 3.01",
        agenda: "Go through test coverage as a team and make sure we're not missing anything critical before submission. Each person should come with a list of what they've tested.",
      },
    });

    const submissionPrep = await prisma.meeting.create({
      data: {
        teamId: team.id,
        organiserId: organiser.id,
        title: "Submission Prep",
        subject: "Final checks before KCL deadline",
        date: daysFromNow(7),
        videoCallLink: "https://meet.google.com/reg-gie-kcl",
        agenda: "Final run through before we submit - check test coverage, make sure the README is done and go over any last issues. Should be pretty quick if everyone's done their bit.",
      },
    });

    const demoRehearsal = await prisma.meeting.create({
      data: {
        teamId: team.id,
        organiserId: organiser.id,
        title: "Demo Rehearsal",
        subject: "End-to-end walkthrough",
        date: daysFromNow(14),
        location: "Bush House 4.02",
        agenda: "Run through the full demo as a team before the presentation. Everyone should know which part they're presenting. Bring questions.",
      },
    });

    const attendanceRows = [
      ...buildAttendanceData(teamIntro.id, presentIds, absentIds),
      ...buildAttendanceData(weeklyCheckIn.id, presentIds, absentIds),
      ...buildAttendanceData(uiReview.id, presentIds, absentIds),
    ];

    await prisma.meetingAttendance.createMany({ data: attendanceRows, skipDuplicates: true });

    const allStudentIds = students.slice(0, 4).map((s) => s.id);
    const allMeetingIds = [teamIntro.id, weeklyCheckIn.id, uiReview.id, testingSession.id, submissionPrep.id, demoRehearsal.id];
    const participantRows = allMeetingIds.flatMap((meetingId) =>
      allStudentIds.map((userId) => ({ meetingId, userId }))
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

    return {
      value: undefined,
      rows: 6,
      details: `team=${team.id}, 4 past + 2 upcoming, ${absentIds.length} members flagged with 3 consecutive absences`,
    };
  });
}
