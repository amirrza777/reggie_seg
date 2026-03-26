import { apiFetch } from "@/shared/api/http";
import type {
  CreateEnterpriseModulePayload,
  EnterpriseModuleAccessResponse,
  EnterpriseModuleAccessSelectionResponse,
  EnterpriseAccessUserSearchParams,
  EnterpriseAccessUserSearchResponse,
  DeleteEnterpriseModuleResponse,
  EnterpriseModuleAccessUsersResponse,
  EnterpriseFeatureFlag,
  EnterpriseModuleCreateResponse,
  EnterpriseModuleJoinCodeResponse,
  EnterpriseModuleRecord,
  EnterpriseModuleSearchParams,
  EnterpriseModuleSearchResponse,
  EnterpriseModuleStudentsResponse,
  EnterpriseOverview,
  UpdateEnterpriseModulePayload,
  UpdateEnterpriseModuleStudentsPayload,
  UpdateEnterpriseModuleStudentsResponse,
} from "../types";

export async function getEnterpriseOverview(): Promise<EnterpriseOverview> {
  return apiFetch<EnterpriseOverview>("/enterprise-admin/overview");
}

export async function listEnterpriseFeatureFlags(): Promise<EnterpriseFeatureFlag[]> {
  return apiFetch<EnterpriseFeatureFlag[]>("/enterprise-admin/feature-flags");
}

export async function updateEnterpriseFeatureFlag(key: string, enabled: boolean): Promise<EnterpriseFeatureFlag> {
  return apiFetch<EnterpriseFeatureFlag>(`/enterprise-admin/feature-flags/${encodeURIComponent(key)}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export async function listEnterpriseModules(): Promise<EnterpriseModuleRecord[]> {
  return apiFetch<EnterpriseModuleRecord[]>("/enterprise-admin/modules");
}

export async function searchEnterpriseModules(
  params: EnterpriseModuleSearchParams = {},
): Promise<EnterpriseModuleSearchResponse> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  const qs = search.toString();
  const path = qs ? `/enterprise-admin/modules/search?${qs}` : "/enterprise-admin/modules/search";
  return apiFetch<EnterpriseModuleSearchResponse>(path);
}

export async function createEnterpriseModule(payload: CreateEnterpriseModulePayload): Promise<EnterpriseModuleCreateResponse> {
  return apiFetch<EnterpriseModuleCreateResponse>("/enterprise-admin/modules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEnterpriseModule(
  moduleId: number,
  payload: UpdateEnterpriseModulePayload,
): Promise<EnterpriseModuleRecord> {
  return apiFetch<EnterpriseModuleRecord>(`/enterprise-admin/modules/${moduleId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteEnterpriseModule(moduleId: number): Promise<DeleteEnterpriseModuleResponse> {
  return apiFetch<DeleteEnterpriseModuleResponse>(`/enterprise-admin/modules/${moduleId}`, {
    method: "DELETE",
  });
}

export async function listEnterpriseModuleAccessUsers(): Promise<EnterpriseModuleAccessUsersResponse> {
  return apiFetch<EnterpriseModuleAccessUsersResponse>("/enterprise-admin/modules/access-users");
}

export async function searchEnterpriseModuleAccessUsers(
  params: EnterpriseAccessUserSearchParams = {},
): Promise<EnterpriseAccessUserSearchResponse> {
  const search = new URLSearchParams();
  if (params.scope) search.set("scope", params.scope);
  if (params.q) search.set("q", params.q);
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.excludeEnrolledInModule) {
    search.set("excludeEnrolledInModule", String(params.excludeEnrolledInModule));
  }
  const qs = search.toString();
  const path = qs ? `/enterprise-admin/modules/access-users/search?${qs}` : "/enterprise-admin/modules/access-users/search";
  return apiFetch<EnterpriseAccessUserSearchResponse>(path);
}

export async function getEnterpriseModuleAccess(moduleId: number): Promise<EnterpriseModuleAccessResponse> {
  return apiFetch<EnterpriseModuleAccessResponse>(`/enterprise-admin/modules/${moduleId}/access`);
}

export async function getEnterpriseModuleAccessSelection(
  moduleId: number,
): Promise<EnterpriseModuleAccessSelectionResponse> {
  return apiFetch<EnterpriseModuleAccessSelectionResponse>(`/enterprise-admin/modules/${moduleId}/access-selection`);
}

export async function getEnterpriseModuleJoinCode(moduleId: number): Promise<EnterpriseModuleJoinCodeResponse> {
  return apiFetch<EnterpriseModuleJoinCodeResponse>(`/enterprise-admin/modules/${moduleId}/join-code`);
}

export async function listEnterpriseModuleStudents(moduleId: number): Promise<EnterpriseModuleStudentsResponse> {
  return apiFetch<EnterpriseModuleStudentsResponse>(`/enterprise-admin/modules/${moduleId}/students`);
}

export async function updateEnterpriseModuleStudents(
  moduleId: number,
  payload: UpdateEnterpriseModuleStudentsPayload,
): Promise<UpdateEnterpriseModuleStudentsResponse> {
  return apiFetch<UpdateEnterpriseModuleStudentsResponse>(`/enterprise-admin/modules/${moduleId}/students`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export type ModuleMeetingSettings = {
  absenceThreshold: number;
  minutesEditWindowDays: number;
  attendanceEditWindowDays: number;
  allowAnyoneToEditMeetings: boolean;
  allowAnyoneToRecordAttendance: boolean;
  allowAnyoneToWriteMinutes: boolean;
};

export async function getModuleMeetingSettings(moduleId: number): Promise<ModuleMeetingSettings> {
  return apiFetch<ModuleMeetingSettings>(`/enterprise-admin/modules/${moduleId}/meeting-settings`);
}

export async function updateModuleMeetingSettings(
  moduleId: number,
  settings: ModuleMeetingSettings,
): Promise<ModuleMeetingSettings> {
  return apiFetch<ModuleMeetingSettings>(`/enterprise-admin/modules/${moduleId}/meeting-settings`, {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
