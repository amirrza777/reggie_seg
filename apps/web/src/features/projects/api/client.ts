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
  TeamHealthMessage,
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

export async function createTeamHealthMessage(
  projectId: number,
  userId: number,
  subject: string,
  details: string
): Promise<TeamHealthMessage> {
  const response = await apiFetch<{ request: TeamHealthMessage }>(`/projects/${projectId}/team-health-messages`, {
    method: "POST",
    body: JSON.stringify({ userId, subject, details }),
  });
  return response.request;
}

export async function getMyTeamHealthMessages(projectId: number, userId: number): Promise<TeamHealthMessage[]> {
  const response = await apiFetch<{ requests: TeamHealthMessage[] }>(
    `/projects/${projectId}/team-health-messages/me?userId=${userId}`,
    { cache: "no-store" }
  );
  return Array.isArray(response.requests) ? response.requests : [];
}

export async function getStaffTeamHealthMessages(
  userId: number,
  projectId: number,
  teamId: number
): Promise<TeamHealthMessage[]> {
  const response = await apiFetch<{ requests: TeamHealthMessage[] }>(
    `/projects/staff/${projectId}/teams/${teamId}/team-health-messages?userId=${userId}`,
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

export async function reviewStaffTeamHealthMessage(
  projectId: number,
  teamId: number,
  requestId: number,
  userId: number,
  resolved: boolean,
  responseText?: string
): Promise<TeamHealthMessage> {
  const payload: { userId: number; resolved: boolean; responseText?: string } = { userId, resolved };
  if (responseText !== undefined) payload.responseText = responseText;

  const response = await apiFetch<{ request: TeamHealthMessage }>(
    `/projects/staff/${projectId}/teams/${teamId}/team-health-messages/${requestId}/review`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
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

export async function resolveStaffTeamHealthMessageWithDeadlineOverride(
  projectId: number,
  teamId: number,
  requestId: number,
  userId: number,
  overrides: StaffTeamDeadlineOverridePayload
): Promise<{ request: TeamHealthMessage; deadline: ProjectDeadline }> {
  return apiFetch<{ request: TeamHealthMessage; deadline: ProjectDeadline }>(
    `/projects/staff/${projectId}/teams/${teamId}/team-health-messages/${requestId}/deadline-override`,
    {
      method: "POST",
      body: JSON.stringify({
        userId,
        ...overrides,
      }),
    }
  );
}
