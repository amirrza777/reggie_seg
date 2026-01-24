import { apiFetch } from "@/shared/api/http";
import type { Meeting } from "../types";

export async function listMeetings(projectId: string): Promise<Meeting[]> {
  return apiFetch<Meeting[]>(`/projects/${projectId}/meetings`);
}
