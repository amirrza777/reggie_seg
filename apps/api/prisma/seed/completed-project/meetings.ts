import { prisma } from "../prismaClient";
import { DAY_MS } from "./helpers";

export async function ensureScenarioMeetings(teamId: number, organiserId: number, memberIds: number[]) {
  const dates = [28, 21, 14, 7].map((daysAgo) => new Date(Date.now() - daysAgo * DAY_MS));
  const counters = { createdMeetings: 0, createdMinutes: 0, createdAttendances: 0 };

  for (let index = 0; index < dates.length; index += 1) {
    const meeting = await upsertScenarioMeeting(teamId, organiserId, index, dates[index]);
    if (!meeting) continue;
    counters.createdMeetings += Number(meeting.created);
    counters.createdMinutes += await ensureMeetingMinutes(meeting.id, organiserId);
    counters.createdAttendances += await ensureMeetingAttendance(meeting.id, memberIds, index);
  }

  return counters;
}

async function upsertScenarioMeeting(teamId: number, organiserId: number, index: number, date: Date) {
  const title = `Completed Check-in ${index + 1}`;
  const existing = await prisma.meeting.findFirst({ where: { teamId, title }, select: { id: true } });
  if (existing) {
    const meeting = await prisma.meeting.findUnique({ where: { id: existing.id }, select: { id: true } });
    return meeting ? { id: meeting.id, created: false } : null;
  }
  const meeting = await prisma.meeting.create({
    data: {
      teamId,
      organiserId,
      title,
      subject: "Project completion sync",
      location: "Online",
      agenda: "Final checks, handover, and retrospective actions.",
      date,
    },
    select: { id: true },
  });
  return { id: meeting.id, created: true };
}

async function ensureMeetingMinutes(meetingId: number, organiserId: number) {
  const minutes = await prisma.meetingMinutes.findUnique({ where: { meetingId }, select: { id: true } });
  if (minutes) return 0;
  await prisma.meetingMinutes.create({
    data: {
      meetingId,
      writerId: organiserId,
      content: "Team reviewed progress, closed open actions, and confirmed final delivery quality.",
    },
  });
  return 1;
}

async function ensureMeetingAttendance(meetingId: number, memberIds: number[], index: number) {
  let created = 0;
  for (let memberIndex = 0; memberIndex < memberIds.length; memberIndex += 1) {
    const memberId = memberIds[memberIndex];
    if (!memberId) continue;
    const existing = await prisma.meetingAttendance.findUnique({
      where: { meetingId_userId: { meetingId, userId: memberId } },
      select: { meetingId: true },
    });
    if (existing) continue;
    const status = memberIndex === memberIds.length - 1 && index % 2 === 0 ? "late" : "present";
    await prisma.meetingAttendance.create({ data: { meetingId, userId: memberId, status } });
    created += 1;
  }
  return created;
}
