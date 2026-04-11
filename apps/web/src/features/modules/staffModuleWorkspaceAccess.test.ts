import { describe, expect, it } from "vitest";
import {
  canOpenStaffModuleManagePage,
  hasStaffModuleListEditRole,
  resolveStaffModuleWorkspaceAccess,
  StaffModuleListSlot,
} from "./staffModuleWorkspaceAccess";
import type { StaffModuleWorkspaceContext } from "./staffModuleWorkspaceLayoutData";

function baseCtx(overrides: Partial<StaffModuleWorkspaceContext>): StaffModuleWorkspaceContext {
  return {
    user: {
      id: 1,
      email: "u@test",
      displayName: "U",
      role: "STAFF",
      isStaff: true,
      isAdmin: false,
      active: true,
    } as StaffModuleWorkspaceContext["user"],
    moduleId: "9",
    parsedModuleId: 9,
    moduleRecord: { id: "9", title: "Mod", accountRole: "OWNER" },
    module: { id: "9", title: "Mod", accountRole: "OWNER" },
    isElevated: false,
    isEnterpriseAdmin: false,
    ...overrides,
  };
}

describe("staffModuleWorkspaceAccess", () => {
  it("resolveStaffModuleWorkspaceAccess matches owner staff expectations", () => {
    const a = resolveStaffModuleWorkspaceAccess(baseCtx({}));
    expect(a.listSlot).toBe(StaffModuleListSlot.Owner);
    expect(a.staffModuleSetup).toBe(true);
    expect(a.enterpriseModuleEditor).toBe(false);
    expect(a.createProjectInModule).toBe(true);
  });

  it("hasStaffModuleListEditRole matches layout helper semantics", () => {
    expect(hasStaffModuleListEditRole({ accountRole: "OWNER" })).toBe(true);
    expect(hasStaffModuleListEditRole({ accountRole: "TEACHING_ASSISTANT" })).toBe(false);
  });

  it("canOpenStaffModuleManagePage is true only for staff module setup capability", () => {
    expect(canOpenStaffModuleManagePage(baseCtx({}))).toBe(true);
    expect(
      canOpenStaffModuleManagePage(
        baseCtx({
          moduleRecord: { id: "9", title: "M", accountRole: "ADMIN_ACCESS" },
          module: { id: "9", title: "M", accountRole: "ADMIN_ACCESS" },
        }),
      ),
    ).toBe(false);
  });
});
