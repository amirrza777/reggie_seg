import { apiFetch } from "@/shared/api/http";
import type {
  CreateStaffProjectPayload,
  CreatedStaffProject,
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
  StaffStudentDeadlineOverride,
  StaffStudentDeadlineOverridePayload,
  ProjectWarningsConfig,
  StaffProjectWarningsConfigResponse,
  ProjectNavFlagsConfig,
  StaffProjectNavFlagsConfigResponse,
  TeamWarning,
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
  return apiFetch<Team>(`/projects/${projectId}/team?userId=${userId}`, {
    cache: "no-store",
  });
}

export async function getProjectMarking(userId: number, projectId: number): Promise<ProjectMarkingSummary> {
  return apiFetch<ProjectMarkingSummary>(`/projects/${projectId}/marking?userId=${userId}`, {
    cache: "no-store",
  });
}

type StaffProjectSearchOptions = {
  query?: string;
  moduleId?: number;
};

export type StaffMarkingTeam = {
  id: number;
  teamName: string;
  projectId: number;
  inactivityFlag: "NONE" | "YELLOW" | "RED";
  studentCount: number;
};

export type StaffMarkingProject = {
  id: number;
  name: string;
  moduleId: number;
  moduleName: string;
  teams: StaffMarkingTeam[];
};

export async function getStaffProjectsForMarking(userId: number, options?: { query?: string }): Promise<StaffMarkingProject[]> {
  const searchParams = new URLSearchParams({ userId: String(userId) });
  if (options?.query?.trim()) {
    searchParams.set("q", options.query.trim());
  }
  return apiFetch<StaffMarkingProject[]>(`/projects/staff/marking?${searchParams.toString()}`);
}

export async function getStaffProjects(userId: number, options?: StaffProjectSearchOptions): Promise<StaffProject[]> {
  const searchParams = new URLSearchParams({ userId: String(userId) });
  if (options?.query?.trim()) {
    searchParams.set("q", options.query.trim());
  }
  if (options?.moduleId != null) {
    searchParams.set("moduleId", String(options.moduleId));
  }
  return apiFetch<StaffProject[]>(`/projects/staff/mine?${searchParams.toString()}`);
}

export async function getStaffProjectTeams(userId: number, projectId: number): Promise<StaffProjectTeamsResponse> {
  return apiFetch<StaffProjectTeamsResponse>(`/projects/staff/${projectId}/teams?userId=${userId}`, {
    cache: "no-store",
  });
}

export async function getStaffProjectWarningsConfig(
  projectId: number,
): Promise<StaffProjectWarningsConfigResponse> {
  return apiFetch<StaffProjectWarningsConfigResponse>(`/projects/staff/${projectId}/warnings-config`, {
    cache: "no-store",
  });
}

export async function updateStaffProjectWarningsConfig(
  projectId: number,
  warningsConfig: ProjectWarningsConfig,
): Promise<StaffProjectWarningsConfigResponse> {
  return apiFetch<StaffProjectWarningsConfigResponse>(`/projects/staff/${projectId}/warnings-config`, {
    method: "PATCH",
    body: JSON.stringify({ warningsConfig }),
  });
}

export async function getStaffProjectNavFlagsConfig(
  projectId: number,
): Promise<StaffProjectNavFlagsConfigResponse> {
  return apiFetch<StaffProjectNavFlagsConfigResponse>(`/projects/staff/${projectId}/project-feature-flags`, {
    cache: "no-store",
  });
}

export async function updateStaffProjectNavFlagsConfig(
  projectId: number,
  projectNavFlags: ProjectNavFlagsConfig,
): Promise<StaffProjectNavFlagsConfigResponse> {
  return apiFetch<StaffProjectNavFlagsConfigResponse>(`/projects/staff/${projectId}/project-feature-flags`, {
    method: "PATCH",
    body: JSON.stringify({ projectNavFlags }),
  });
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

export async function getStaffStudentDeadlineOverrides(
  projectId: number,
): Promise<StaffStudentDeadlineOverride[]> {
  const response = await apiFetch<{ overrides: StaffStudentDeadlineOverride[] }>(
    `/projects/staff/${projectId}/students/deadline-overrides`,
    { cache: "no-store" }
  );
  return response.overrides;
}

export async function upsertStaffStudentDeadlineOverride(
  projectId: number,
  studentId: number,
  payload: StaffStudentDeadlineOverridePayload,
): Promise<StaffStudentDeadlineOverride> {
  const response = await apiFetch<{ override: StaffStudentDeadlineOverride }>(
    `/projects/staff/${projectId}/students/${studentId}/deadline-override`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
  return response.override;
}

export async function clearStaffStudentDeadlineOverride(
  projectId: number,
  studentId: number,
): Promise<{ cleared: boolean }> {
  return apiFetch<{ cleared: boolean }>(
    `/projects/staff/${projectId}/students/${studentId}/deadline-override`,
    {
      method: "DELETE",
    },
  );
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

export async function getMyTeamWarnings(projectId: number, userId: number): Promise<TeamWarning[]> {
  const response = await apiFetch<{ warnings: TeamWarning[] }>(
    `/projects/${projectId}/team-warnings/me?userId=${userId}`,
    { cache: "no-store" }
  );
  return Array.isArray(response.warnings) ? response.warnings : [];
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

export async function getStaffTeamWarnings(
  userId: number,
  projectId: number,
  teamId: number
): Promise<TeamWarning[]> {
  const response = await apiFetch<{ warnings: TeamWarning[] }>(
    `/projects/staff/${projectId}/teams/${teamId}/warnings?userId=${userId}`,
    { cache: "no-store" }
  );
  return Array.isArray(response.warnings) ? response.warnings : [];
}

export async function resolveStaffTeamWarning(
  userId: number,
  projectId: number,
  teamId: number,
  warningId: number,
): Promise<TeamWarning> {
  const response = await apiFetch<{ warning: TeamWarning }>(
    `/projects/staff/${projectId}/teams/${teamId}/warnings/${warningId}/resolve`,
    {
      method: "PATCH",
      body: JSON.stringify({ userId }),
    }
  );
  return response.warning;
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
