import { apiFetch } from "@/shared/api/http";
import type { StaffMeeting } from "../types";

export async function listTeamMeetings(teamId: number) {
  return apiFetch<StaffMeeting[]>(`/meetings/team/${teamId}`);
}
