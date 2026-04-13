import { getMeetingById, upsertMinutes, getModuleMeetingSettingsForTeam } from "../repo.js";
import { assertProjectMutableForWritesByTeamId } from "../../../shared/projectWriteGuard.js";

/** Saves the minutes. */
export async function saveMinutes(meetingId: number, writerId: number, content: string) {
  const meeting = await getMeetingById(meetingId);
  if (!meeting) throw { code: "NOT_FOUND" };
  await assertProjectMutableForWritesByTeamId(meeting.teamId);
  const isOriginalWriter = meeting.minutes?.writerId === writerId;
  if (meeting.minutes && !isOriginalWriter) {
    const settings = await getModuleMeetingSettingsForTeam(meeting.teamId);
    const isMember = meeting.team.allocations.some((a) => a.userId === writerId);
    if (!settings.allowAnyoneToWriteMinutes || !isMember) throw { code: "FORBIDDEN" };
  }
  return upsertMinutes(meetingId, writerId, content);
}
