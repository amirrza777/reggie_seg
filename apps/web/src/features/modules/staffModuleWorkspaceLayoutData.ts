import { cache } from "react";
import { listModules } from "./api/client";
import type { Module } from "./types";
import { loadStaffProjectsWithTeamsForPage } from "@/features/staff/projects/lib/staffModuleProjectsPageData";
import { getCurrentUser, isAdmin } from "@/shared/auth/session";

export type StaffModuleWorkspaceContext = {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  moduleId: string;
  parsedModuleId: number;
  moduleRecord: Module | null;
  module: Module;
  isElevated: boolean;
  isEnterpriseAdmin: boolean;
};

/**
 * Staff-only context for `/staff/modules/[moduleId]/*`.
 * Access matches the staff module projects page (staff assignment, elevated role, or projects in module).
 */
export const loadStaffModuleWorkspaceContext = cache(
  async (moduleId: string): Promise<StaffModuleWorkspaceContext | null> => {
    const user = await getCurrentUser();
    if (!user) return null;
    if (!user.isStaff && user.role !== "ADMIN" && user.role !== "ENTERPRISE_ADMIN") {
      return null;
    }

    const parsedModuleId = Number(moduleId);
    if (!Number.isInteger(parsedModuleId) || parsedModuleId <= 0) {
      return null;
    }

    let staffModules: Module[] = [];
    try {
      staffModules = await listModules(user.id, { scope: "staff" });
    } catch {
      return null;
    }

    const moduleRecord = staffModules.find((m) => Number(m.id) === parsedModuleId) ?? null;
    const isElevated = isAdmin(user) || user.role === "ENTERPRISE_ADMIN";

    let fallbackTitle: string | undefined;
    if (!moduleRecord && !isElevated) {
      const { projects } = await loadStaffProjectsWithTeamsForPage(user.id, { moduleId: parsedModuleId });
      if (projects.length === 0) return null;
      fallbackTitle = projects[0]?.moduleName;
    }

    const title = moduleRecord?.title ?? fallbackTitle ?? `Module ${parsedModuleId}`;
    const module: Module =
      moduleRecord ??
      ({
        id: String(parsedModuleId),
        title,
        accountRole: isElevated ? "ADMIN_ACCESS" : undefined,
        teamCount: 0,
        projectCount: 0,
      } satisfies Module);

    return {
      user,
      moduleId,
      parsedModuleId,
      moduleRecord,
      module,
      isElevated,
      isEnterpriseAdmin: Boolean(user.isEnterpriseAdmin || user.role === "ENTERPRISE_ADMIN"),
    };
  },
);
