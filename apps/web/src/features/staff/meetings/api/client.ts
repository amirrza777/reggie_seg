import { apiFetch } from "@/shared/api/http";
import type { StaffMeeting } from "../types";

export type TeamMeetingSettings = {
  absenceThreshold: number;
  minutesEditWindowDays: number;
  allowAnyoneToEditMeetings: boolean;
  allowAnyoneToRecordAttendance: boolean;
  allowAnyoneToWriteMinutes: boolean;
};

export async function listTeamMeetings(teamId: number) {
  return apiFetch<StaffMeeting[]>(`/meetings/team/${teamId}`);
}

export async function getTeamMeetingSettings(teamId: number) {
  return apiFetch<TeamMeetingSettings>(`/meetings/team/${teamId}/settings`);
}
