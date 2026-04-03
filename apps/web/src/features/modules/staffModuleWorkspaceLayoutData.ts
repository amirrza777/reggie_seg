import { cache } from "react";
import { listModules } from "./api/client";
import { isModuleArchivedFromApi } from "./moduleArchiveState";
import type { Module } from "./types";
import { loadStaffProjectsWithTeamsForPage } from "@/features/staff/projects/lib/staffModuleProjectsPageData";
import { getCurrentUser, isAdmin, isEnterpriseAdmin } from "@/shared/auth/session";

export type StaffModuleWorkspaceContext = {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  moduleId: string;
  parsedModuleId: number;
  moduleRecord: Module | null;
  module: Module;
  isElevated: boolean;
  isEnterpriseAdmin: boolean;
};

export const StaffModuleListSlot = {
  None: "none",
  Owner: "owner",
  AdminAccess: "admin_access",
  TeachingAssistant: "teaching_assistant",
} as const;

export type StaffModuleListSlot = (typeof StaffModuleListSlot)[keyof typeof StaffModuleListSlot];

export type StaffModuleWorkspaceAccess = {
  listSlot: StaffModuleListSlot;
  orgOrPlatformAdmin: boolean;
  staffModuleSetup: boolean;
  enterpriseModuleEditor: boolean;
  createProjectInModule: boolean;
  isArchived: boolean;
  canEdit: boolean;
  canCreateProject: boolean;
};

function listSlotFromRecord(moduleRecord: Module | null | undefined): StaffModuleListSlot {
  const role = moduleRecord?.accountRole;
  if (role === "OWNER") return StaffModuleListSlot.Owner;
  if (role === "ADMIN_ACCESS") return StaffModuleListSlot.AdminAccess;
  if (role === "TEACHING_ASSISTANT") return StaffModuleListSlot.TeachingAssistant;
  return StaffModuleListSlot.None;
}

/**
 * Derived flags from {@link loadStaffModuleWorkspaceContext} (roles, archive, canEdit, …).
 */
export function resolveStaffModuleWorkspaceAccess(ctx: StaffModuleWorkspaceContext): StaffModuleWorkspaceAccess {
  const listSlot = listSlotFromRecord(ctx.moduleRecord);
  const orgOrPlatformAdmin = isEnterpriseAdmin(ctx.user) || isAdmin(ctx.user);
  const staffOrPlatformAdmin = Boolean(ctx.user.isStaff) || isAdmin(ctx.user);

  const isArchived = isModuleArchivedFromApi(ctx.module);

  const staffModuleSetup = listSlot === StaffModuleListSlot.Owner && staffOrPlatformAdmin;

  const enterpriseModuleEditor = orgOrPlatformAdmin;

  const createProjectInModule =
    listSlot === StaffModuleListSlot.Owner || listSlot === StaffModuleListSlot.AdminAccess;

  const canEdit = (staffModuleSetup || enterpriseModuleEditor) && !isArchived;
  const canCreateProject = createProjectInModule && !isArchived;

  return {
    listSlot,
    orgOrPlatformAdmin,
    staffModuleSetup,
    enterpriseModuleEditor,
    createProjectInModule,
    isArchived,
    canEdit,
    canCreateProject,
  };
}

/** OWNER or ADMIN_ACCESS */
export function hasStaffModuleListEditRole(moduleRecord: Pick<Module, "accountRole"> | null | undefined): boolean {
  const r = moduleRecord?.accountRole;
  return r === "OWNER" || r === "ADMIN_ACCESS";
}

export function canOpenStaffModuleManagePage(ctx: StaffModuleWorkspaceContext): boolean {
  const a = resolveStaffModuleWorkspaceAccess(ctx);
  return a.staffModuleSetup && a.canEdit;
}

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
