import { apiFetch } from "@/shared/api/http";
import type {
  Module,
  ModuleStaffListMember,
  ModuleStudentProjectMatrixProject,
  ModuleStudentProjectMatrixStudent,
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

  // Avoid stale RSC/cache responses when switching staff vs workspace module shapes.
  return apiFetch<Module[]>(`/projects/modules?${searchParams.toString()}`, { cache: "no-store" });
}

/** Leads + TAs on a module */
export async function getModuleStaffList(
  moduleId: string | number,
): Promise<{ members: ModuleStaffListMember[] }> {
  const id = encodeURIComponent(String(moduleId));
  return apiFetch<{ members: ModuleStaffListMember[] }>(`/projects/modules/${id}/staff`, {
    cache: "no-store",
  });
}

/** Enrolled students and team assignment per project (staff module matrix). */
export async function getModuleStudentProjectMatrix(moduleId: string | number): Promise<{
  projects: ModuleStudentProjectMatrixProject[];
  students: ModuleStudentProjectMatrixStudent[];
}> {
  const id = encodeURIComponent(String(moduleId));
  return apiFetch<{ projects: ModuleStudentProjectMatrixProject[]; students: ModuleStudentProjectMatrixStudent[] }>(
    `/projects/modules/${id}/student-project-matrix`,
    { cache: "no-store" },
  );
}
