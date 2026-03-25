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

describe("hasStaffModuleListEditRole", () => {
  it("is true for OWNER and ADMIN_ACCESS", () => {
    expect(hasStaffModuleListEditRole({ id: "1", title: "M", accountRole: "OWNER" })).toBe(true);
    expect(hasStaffModuleListEditRole({ id: "1", title: "M", accountRole: "ADMIN_ACCESS" })).toBe(true);
  });

  it("is false for TA, missing record, or missing role", () => {
    expect(hasStaffModuleListEditRole({ id: "1", title: "M", accountRole: "TEACHING_ASSISTANT" })).toBe(false);
    expect(hasStaffModuleListEditRole(null)).toBe(false);
    expect(hasStaffModuleListEditRole({ id: "1", title: "M" })).toBe(false);
  });
});

describe("canOpenStaffModuleManagePage", () => {
  it("requires OWNER, module record, and staff or platform ADMIN role", () => {
    expect(canOpenStaffModuleManagePage(baseCtx({}))).toBe(true);
    expect(
      canOpenStaffModuleManagePage(
        baseCtx({
          moduleRecord: { id: "9", title: "M", accountRole: "ADMIN_ACCESS" },
          module: { id: "9", title: "M", accountRole: "ADMIN_ACCESS" },
        }),
      ),
    ).toBe(false);
    expect(
      canOpenStaffModuleManagePage(
        baseCtx({
          user: { ...baseCtx({}).user, isStaff: false, role: "ADMIN", isAdmin: true },
        }),
      ),
    ).toBe(true);
    expect(
      canOpenStaffModuleManagePage(
        baseCtx({
          user: { ...baseCtx({}).user, isStaff: false, role: "ENTERPRISE_ADMIN", isEnterpriseAdmin: true },
        }),
      ),
    ).toBe(false);
  });
});

describe("resolveStaffModuleWorkspaceAccess", () => {
  it("grants staff module setup for module lead on list (staff user)", () => {
    const a = resolveStaffModuleWorkspaceAccess(baseCtx({}));
    expect(a.listSlot).toBe(StaffModuleListSlot.Owner);
    expect(a.staffModuleSetup).toBe(true);
    expect(a.enterpriseModuleEditor).toBe(false);
    expect(a.createProjectInModule).toBe(true);
  });

  it("grants enterprise module editor for enterprise admin without list row", () => {
    const b = resolveStaffModuleWorkspaceAccess(
      baseCtx({
        moduleRecord: null,
        module: { id: "9", title: "M" },
        isEnterpriseAdmin: true,
        user: { ...baseCtx({}).user, role: "ENTERPRISE_ADMIN", isEnterpriseAdmin: true },
      }),
    );
    expect(b.listSlot).toBe(StaffModuleListSlot.None);
    expect(b.orgOrPlatformAdmin).toBe(true);
    expect(b.enterpriseModuleEditor).toBe(true);
    expect(b.staffModuleSetup).toBe(false);
  });

  it("grants enterprise module editor for platform ADMIN without list (matches enterprise layout)", () => {
    const p = resolveStaffModuleWorkspaceAccess(
      baseCtx({
        moduleRecord: null,
        module: { id: "9", title: "M" },
        user: { ...baseCtx({}).user, isStaff: false, role: "ADMIN", isAdmin: true },
        isElevated: true,
      }),
    );
    expect(p.enterpriseModuleEditor).toBe(true);
    expect(p.staffModuleSetup).toBe(false);
  });

  it("does not grant staff manage for ADMIN_ACCESS even when enterprise admin", () => {
    const c = resolveStaffModuleWorkspaceAccess(
      baseCtx({
        moduleRecord: { id: "9", title: "M", accountRole: "ADMIN_ACCESS" },
        module: { id: "9", title: "M", accountRole: "ADMIN_ACCESS" },
        isEnterpriseAdmin: true,
        user: { ...baseCtx({}).user, role: "ENTERPRISE_ADMIN", isEnterpriseAdmin: true },
      }),
    );
    expect(c.listSlot).toBe(StaffModuleListSlot.AdminAccess);
    expect(c.createProjectInModule).toBe(true);
    expect(c.staffModuleSetup).toBe(false);
    expect(c.enterpriseModuleEditor).toBe(true);
  });
});
