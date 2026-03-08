import { apiFetch } from "@/shared/api/http";
import type {
  CreateEnterpriseModulePayload,
  EnterpriseModuleRecord,
  EnterpriseModuleStudentsResponse,
  EnterpriseOverview,
  UpdateEnterpriseModuleStudentsPayload,
  UpdateEnterpriseModuleStudentsResponse,
} from "../types";

export async function getEnterpriseOverview(): Promise<EnterpriseOverview> {
  return apiFetch<EnterpriseOverview>("/enterprise-admin/overview");
}

export async function listEnterpriseModules(): Promise<EnterpriseModuleRecord[]> {
  return apiFetch<EnterpriseModuleRecord[]>("/enterprise-admin/modules");
}

export async function createEnterpriseModule(payload: CreateEnterpriseModulePayload): Promise<EnterpriseModuleRecord> {
  return apiFetch<EnterpriseModuleRecord>("/enterprise-admin/modules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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
