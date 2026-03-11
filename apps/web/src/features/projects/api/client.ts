import { apiFetch } from "@/shared/api/http";
import type {
  Project,
  ProjectDeadline,
  Team,
  ProjectMarkingSummary,
  StaffProject,
  StaffProjectTeamsResponse,
  MCFRequest,
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

export async function createMcfRequest(
  projectId: number,
  userId: number,
  subject: string,
  details: string
): Promise<MCFRequest> {
  const response = await apiFetch<{ request: MCFRequest }>(`/projects/${projectId}/mcf-requests`, {
    method: "POST",
    body: JSON.stringify({ userId, subject, details }),
  });
  return response.request;
}

export async function getMyMcfRequests(projectId: number, userId: number): Promise<MCFRequest[]> {
  const response = await apiFetch<{ requests: MCFRequest[] }>(
    `/projects/${projectId}/mcf-requests/me?userId=${userId}`,
    { cache: "no-store" }
  );
  return Array.isArray(response.requests) ? response.requests : [];
}
