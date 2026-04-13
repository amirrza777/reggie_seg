import { getMeetingById, getModuleMeetingSettingsForTeam } from "../repo.js";

/** Returns the module meeting settings for a meeting. */
export async function fetchMeetingSettings(meetingId: number) {
  const meeting = await getMeetingById(meetingId);
  if (!meeting) return null;
  return getModuleMeetingSettingsForTeam(meeting.teamId);
}

/** Returns the module meeting settings for a team. */
export function fetchTeamMeetingSettings(teamId: number) {
  return getModuleMeetingSettingsForTeam(teamId);
}
