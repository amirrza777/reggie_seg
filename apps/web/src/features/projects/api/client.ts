import { apiFetch } from "@/shared/api/http";
import type {
  CreateStaffProjectPayload,
  CreatedStaffProject,
  Project,
  ProjectDeadline,
  Team,
  ProjectMarkingSummary,
  StaffProject,
  StaffProjectTeamsResponse,
} from "../types";

export async function getProject(projectId: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${projectId}`);
}

export async function getUserProjects(userId: number): Promise<Project[]> {
  return apiFetch<Project[]>(`/projects?userId=${userId}`);
}

export async function getProjectDeadline(userId: number, projectId: number): Promise<ProjectDeadline> {
  const response = await apiFetch<{ deadline: ProjectDeadline }>(`/projects/${projectId}/deadline?userId=${userId}`);
  return response.deadline;
}

export async function getTeammatesInProject(userId: number, projectId: number) {
  return apiFetch(`/projects/${projectId}/teammates?userId=${userId}`);
}

export async function getTeamById(teamId: number): Promise<Team> {
  return apiFetch<Team>(`/projects/teams/${teamId}`);
}

export async function getTeamByUserAndProject(userId: number, projectId: number): Promise<Team> {
  return apiFetch<Team>(`/projects/${projectId}/team?userId=${userId}`);
}

export async function getProjectMarking(userId: number, projectId: number): Promise<ProjectMarkingSummary> {
  return apiFetch<ProjectMarkingSummary>(`/projects/${projectId}/marking?userId=${userId}`, {
    cache: "no-store",
  });
}

export async function getStaffProjects(userId: number): Promise<StaffProject[]> {
  return apiFetch<StaffProject[]>(`/projects/staff/mine?userId=${userId}`);
}

export async function getStaffProjectTeams(userId: number, projectId: number): Promise<StaffProjectTeamsResponse> {
  return apiFetch<StaffProjectTeamsResponse>(`/projects/staff/${projectId}/teams?userId=${userId}`);
}

export async function createStaffProject(payload: CreateStaffProjectPayload): Promise<CreatedStaffProject> {
  return apiFetch<CreatedStaffProject>("/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function dismissTeamFlag(teamId: number): Promise<void> {
  await apiFetch(`/teams/${teamId}/dismiss-flag`, { method: "PATCH" });
}

export async function updateStaffTeamDeadlineProfile(
  teamId: number,
  deadlineProfile: "STANDARD" | "MCF",
): Promise<{ id: number; deadlineProfile: "STANDARD" | "MCF" }> {
  return apiFetch<{ id: number; deadlineProfile: "STANDARD" | "MCF" }>(
    `/projects/staff/teams/${teamId}/deadline-profile`,
    {
      method: "PATCH",
      body: JSON.stringify({ deadlineProfile }),
    },
  );
}
