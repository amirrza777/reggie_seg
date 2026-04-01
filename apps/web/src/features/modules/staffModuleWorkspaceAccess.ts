import { isModuleArchivedFromApi } from "./moduleArchiveState";
import type { Module } from "./types";
import type { StaffModuleWorkspaceContext } from "./staffModuleWorkspaceLayoutData";
import { isAdmin, isEnterpriseAdmin } from "@/shared/auth/session";

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
  moduleArchived: boolean;
  /** True when owner or admin_access, and module is not archived. */
  canEdit: boolean;
  /** True when owner or admin_access, and module is not archived. */
  canCreateProject: boolean;
};

function listSlotFromRecord(moduleRecord: Module | null | undefined): StaffModuleListSlot {
  const role = moduleRecord?.accountRole;
  if (role === "OWNER") return StaffModuleListSlot.Owner;
  if (role === "ADMIN_ACCESS") return StaffModuleListSlot.AdminAccess;
  if (role === "TEACHING_ASSISTANT") return StaffModuleListSlot.TeachingAssistant;
  return StaffModuleListSlot.None;
}


export function resolveStaffModuleWorkspaceAccess(ctx: StaffModuleWorkspaceContext): StaffModuleWorkspaceAccess {
  const listSlot = listSlotFromRecord(ctx.moduleRecord);
  const orgOrPlatformAdmin = isEnterpriseAdmin(ctx.user) || isAdmin(ctx.user);
  const staffOrPlatformAdmin = Boolean(ctx.user.isStaff) || isAdmin(ctx.user);

  const moduleArchived = isModuleArchivedFromApi(ctx.module);

  const staffModuleSetup = listSlot === StaffModuleListSlot.Owner && staffOrPlatformAdmin;

  const enterpriseModuleEditor = orgOrPlatformAdmin;

  const createProjectInModule =
    listSlot === StaffModuleListSlot.Owner || listSlot === StaffModuleListSlot.AdminAccess;

  const canEdit = (staffModuleSetup || enterpriseModuleEditor) && !moduleArchived;
  const canCreateProject = createProjectInModule && !moduleArchived;

  return {
    listSlot,
    orgOrPlatformAdmin,
    staffModuleSetup,
    enterpriseModuleEditor,
    createProjectInModule,
    moduleArchived,
    canEdit,
    canCreateProject,
  };
}

/** OWNER or ADMIN_ACCESS on the staff list — e.g. “Create project”. */
export function hasStaffModuleListEditRole(moduleRecord: Pick<Module, "accountRole"> | null | undefined): boolean {
  const r = moduleRecord?.accountRole;
  return r === "OWNER" || r === "ADMIN_ACCESS";
}

export function canOpenStaffModuleManagePage(ctx: StaffModuleWorkspaceContext): boolean {
  const a = resolveStaffModuleWorkspaceAccess(ctx);
  return a.staffModuleSetup && a.canEdit;
}
