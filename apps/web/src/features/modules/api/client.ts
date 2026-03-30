import { apiFetch } from "@/shared/api/http";
import type {
  JoinModulePayload,
  JoinModuleResponse,
  Module,
  ModuleStaffListMember,
  ModuleStudentProjectMatrixProject,
  ModuleStudentProjectMatrixStudent,
  ModuleStudent,
} from "../types";

type ListModulesOptions = {
  scope?: "staff";
  compact?: boolean;
  query?: string;
};

export async function listModules(userId: number, options?: ListModulesOptions): Promise<Module[]> {
  const searchParams = new URLSearchParams({ userId: String(userId) });
  if (options?.scope === "staff") {
    searchParams.set("scope", "staff");
  }
  if (options?.compact) {
    searchParams.set("compact", "1");
  }
  if (options?.query?.trim()) {
    searchParams.set("q", options.query.trim());
  }

  return apiFetch<Module[]>(`/projects/modules?${searchParams.toString()}`);
}

export async function joinModuleByCode(payload: JoinModulePayload): Promise<JoinModuleResponse> {
  return apiFetch<JoinModuleResponse>("/projects/modules/join", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getModuleStaffList(
  moduleId: string | number,
): Promise<{ members: ModuleStaffListMember[] }> {
  const id = encodeURIComponent(String(moduleId));
  return apiFetch<{ members: ModuleStaffListMember[] }>(`/projects/modules/${id}/staff`);
}

export async function getModuleStudentProjectMatrix(moduleId: number): Promise<{
  projects: ModuleStudentProjectMatrixProject[];
  students: ModuleStudentProjectMatrixStudent[];
}> {
  return apiFetch<{
    projects: ModuleStudentProjectMatrixProject[];
    students: ModuleStudentProjectMatrixStudent[];
  }>(`/projects/modules/${moduleId}/student-project-matrix`);
}

export async function getModuleStudents(moduleId: number): Promise<{ students: ModuleStudent[] }> {
  const id = encodeURIComponent(String(moduleId));
  return apiFetch<{ students: ModuleStudent[] }>(`/enterprise/modules/${id}/students`);
}
