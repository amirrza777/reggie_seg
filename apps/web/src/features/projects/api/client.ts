import { apiFetch } from "@/shared/api/http";
import type {
  Project,
  ProjectDeadline,
  StaffTeamDeadlineDetails,
  DeadlineFieldKey,
  DeadlineInputMode,
  Team,
  ProjectMarkingSummary,
  StaffProject,
  StaffProjectTeamsResponse,
  MCFRequest,
  MCFRequestStatus,
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

export async function getStaffTeamMcfRequests(
  userId: number,
  projectId: number,
  teamId: number
): Promise<MCFRequest[]> {
  const response = await apiFetch<{ requests: MCFRequest[] }>(
    `/projects/staff/${projectId}/teams/${teamId}/mcf-requests?userId=${userId}`,
    { cache: "no-store" }
  );
  return Array.isArray(response.requests) ? response.requests : [];
}

export async function getStaffTeamDeadline(
  userId: number,
  projectId: number,
  teamId: number
): Promise<StaffTeamDeadlineDetails> {
  const response = await apiFetch<{ deadline: StaffTeamDeadlineDetails }>(
    `/projects/staff/${projectId}/teams/${teamId}/deadline?userId=${userId}`,
    { cache: "no-store" }
  );
  return response.deadline;
}

export async function reviewStaffTeamMcfRequest(
  projectId: number,
  teamId: number,
  requestId: number,
  userId: number,
  status: Extract<MCFRequestStatus, "IN_REVIEW" | "REJECTED">
): Promise<MCFRequest> {
  const response = await apiFetch<{ request: MCFRequest }>(
    `/projects/staff/${projectId}/teams/${teamId}/mcf-requests/${requestId}/review`,
    {
      method: "PATCH",
      body: JSON.stringify({ userId, status }),
    }
  );
  return response.request;
}

export type StaffTeamDeadlineOverridePayload = {
  taskOpenDate?: string | null;
  taskDueDate?: string | null;
  assessmentOpenDate?: string | null;
  assessmentDueDate?: string | null;
  feedbackOpenDate?: string | null;
  feedbackDueDate?: string | null;
  deadlineInputMode?: DeadlineInputMode;
  shiftDays?: Partial<Record<DeadlineFieldKey, number>>;
};

export async function resolveStaffTeamMcfRequestWithDeadlineOverride(
  projectId: number,
  teamId: number,
  requestId: number,
  userId: number,
  overrides: StaffTeamDeadlineOverridePayload
): Promise<{ request: MCFRequest; deadline: ProjectDeadline }> {
  return apiFetch<{ request: MCFRequest; deadline: ProjectDeadline }>(
    `/projects/staff/${projectId}/teams/${teamId}/mcf-requests/${requestId}/deadline-override`,
    {
      method: "POST",
      body: JSON.stringify({
        userId,
        ...overrides,
      }),
    }
  );
}
