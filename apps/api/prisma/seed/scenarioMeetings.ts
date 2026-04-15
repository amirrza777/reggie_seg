import { prisma } from "./prismaClient";

const DAY_MS = 24 * 60 * 60 * 1000;

type SeedScenarioPastAndUpcomingMeetingsInput = {
  teamId: number;
  organiserId: number;
  memberIds?: number[];
  titlePrefix: string;
  subject?: string;
  agenda?: string;
  location?: string;
  previousOffsetDays?: number;
  upcomingOffsetDays?: number;
  seedPastAttendance?: boolean;
  seedPastMinutes?: boolean;
  minutesContent?: string;
};

type ScenarioMeetingSeed = {
  title: string;
  date: Date;
};

function buildScenarioMeetingSeeds(input: SeedScenarioPastAndUpcomingMeetingsInput): ScenarioMeetingSeed[] {
  const now = Date.now();
  const previousOffset = input.previousOffsetDays ?? 3;
  const upcomingOffset = input.upcomingOffsetDays ?? 3;
  return [
    {
      title: `[SEED] ${input.titlePrefix} Previous Meeting`,
      date: new Date(now - previousOffset * DAY_MS),
    },
    {
      title: `[SEED] ${input.titlePrefix} Upcoming Meeting`,
      date: new Date(now + upcomingOffset * DAY_MS),
    },
  ];
}

export async function seedScenarioPastAndUpcomingMeetings(input: SeedScenarioPastAndUpcomingMeetingsInput) {
  const subject = input.subject ?? "Scenario planning and follow-up";
  const location = input.location ?? "Online";
  const agenda = input.agenda ?? "Review scenario status, ownership, and next actions.";
  const seeds = buildScenarioMeetingSeeds(input);
  let created = 0;
  let attendanceRows = 0;
  const shouldSeedPastAttendance = input.seedPastAttendance ?? true;
  const shouldSeedPastMinutes = input.seedPastMinutes ?? true;
  const minutesContent = input.minutesContent ?? "Scenario retrospective and action checkpoints were reviewed by the team.";

  for (const seed of seeds) {
    let meetingId: number;
    const existing = await prisma.meeting.findFirst({
      where: { teamId: input.teamId, title: seed.title },
      select: { id: true },
    });
    if (existing) {
      await prisma.meeting.update({
        where: { id: existing.id },
        data: {
          organiserId: input.organiserId,
          title: seed.title,
          subject,
          location,
          agenda,
          date: seed.date,
        },
      });
      meetingId = existing.id;
    } else {
      const createdMeeting = await prisma.meeting.create({
        data: {
          teamId: input.teamId,
          organiserId: input.organiserId,
          title: seed.title,
          subject,
          location,
          agenda,
          date: seed.date,
        },
        select: { id: true },
      });
      meetingId = createdMeeting.id;
      created += 1;
    }

    if (shouldSeedPastAttendance && seed.date.getTime() < Date.now()) {
      attendanceRows += await seedPastMeetingAttendance(meetingId, input.memberIds ?? []);
      if (shouldSeedPastMinutes) {
        await seedPastMeetingMinutes(meetingId, input.organiserId, minutesContent);
      }
    }
  }

  return { created, total: seeds.length, attendanceRows };
}

function uniquePositiveIds(userIds: number[]) {
  return Array.from(new Set(userIds.filter((userId) => Number.isInteger(userId) && userId > 0)));
}

async function seedPastMeetingAttendance(meetingId: number, memberIds: number[]) {
  const uniqueMembers = uniquePositiveIds(memberIds);
  if (uniqueMembers.length === 0) return 0;

  for (const userId of uniqueMembers) {
    await prisma.meetingAttendance.upsert({
      where: { meetingId_userId: { meetingId, userId } },
      update: { status: "on_time" },
      create: { meetingId, userId, status: "on_time" },
    });
  }

  return uniqueMembers.length;
}

async function seedPastMeetingMinutes(meetingId: number, writerId: number, content: string) {
  await prisma.meetingMinutes.upsert({
    where: { meetingId },
    update: { writerId, content },
    create: { meetingId, writerId, content },
  });
}
