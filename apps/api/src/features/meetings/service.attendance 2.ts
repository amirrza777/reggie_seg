import {
  getMeetingById,
  bulkUpsertAttendance,
  getRecentAttendanceForUser,
  getModuleLeadsForTeam,
  getModuleMeetingSettingsForTeam,
} from "./repo.js";
import { addNotification } from "../notifications/service.js";

/** Marks the attendance. */
export async function markAttendance(meetingId: number, records: { userId: number; status: string }[]) {
  await bulkUpsertAttendance(meetingId, records);
  await checkAndNotifyConsecutiveAbsences(meetingId, records);
}

async function checkAndNotifyConsecutiveAbsences(
  meetingId: number,
  records: { userId: number; status: string }[],
) {
  const meeting = await getMeetingById(meetingId);
  if (!meeting) return;

  const { absenceThreshold } = await getModuleMeetingSettingsForTeam(meeting.teamId);
  const moduleLeads = await getModuleLeadsForTeam(meeting.teamId);

  for (const record of records) {
    if (record.status.toLowerCase() !== "absent") continue;
    await notifyIfConsecutivelyAbsent(record.userId, meeting, absenceThreshold, moduleLeads);
  }
}

async function notifyIfConsecutivelyAbsent(
  userId: number,
  meeting: NonNullable<Awaited<ReturnType<typeof getMeetingById>>>,
  absenceThreshold: number,
  moduleLeads: Awaited<ReturnType<typeof getModuleLeadsForTeam>>,
) {
  const recent = await getRecentAttendanceForUser(userId, meeting.teamId, absenceThreshold);
  if (recent.length < absenceThreshold) return;
  if (!recent.every((a) => a.status.toLowerCase() === "absent")) return;

  const allocation = meeting.team.allocations.find((a) => a.user.id === userId);
  const userName = allocation ? `${allocation.user.firstName} ${allocation.user.lastName}` : "Someone";

  await addNotification({
    userId,
    type: "LOW_ATTENDANCE",
    message: `You have missed your last ${absenceThreshold} team meetings. Your team needs you!`,
    link: `/projects/${meeting.team.projectId}/meetings`,
  });

  await Promise.all(
    moduleLeads.map((lead) =>
      addNotification({
        userId: lead.userId,
        type: "LOW_ATTENDANCE",
        message: `${userName} has missed their last ${absenceThreshold} meetings in ${meeting.team.teamName}`,
        link: `/staff/projects/${meeting.team.projectId}/teams/${meeting.teamId}/team-meetings`,
      })
    )
  );
}
