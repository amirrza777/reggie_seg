import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/auth/session")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(),
  };
});

vi.mock("./api/client", () => ({
  listModules: vi.fn(),
}));

vi.mock("@/features/staff/projects/lib/staffModuleProjectsPageData", () => ({
  loadStaffProjectsWithTeamsForPage: vi.fn(),
}));

import { getCurrentUser } from "@/shared/auth/session";
import { listModules } from "./api/client";
import { loadStaffProjectsWithTeamsForPage } from "@/features/staff/projects/lib/staffModuleProjectsPageData";
import { loadStaffModuleWorkspaceContext } from "./staffModuleWorkspaceLayoutData";

const getCurrentUserMock = vi.mocked(getCurrentUser);
const listModulesMock = vi.mocked(listModules);
const loadStaffProjectsMock = vi.mocked(loadStaffProjectsWithTeamsForPage);

const staffUser = {
  id: 1,
  isStaff: true,
  role: "STAFF",
  isAdmin: false,
  isEnterpriseAdmin: false,
  active: true,
  email: "s@test",
  displayName: "S",
} as Awaited<ReturnType<typeof getCurrentUser>>;

describe("loadStaffModuleWorkspaceContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when there is no signed-in user", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    await expect(loadStaffModuleWorkspaceContext("101")).resolves.toBeNull();
  });

  it("returns null for users who are not staff or elevated roles", async () => {
    getCurrentUserMock.mockResolvedValue({
      ...staffUser,
      isStaff: false,
      role: "STUDENT",
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    await expect(loadStaffModuleWorkspaceContext("102")).resolves.toBeNull();
  });

  it("returns null for invalid module ids", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    await expect(loadStaffModuleWorkspaceContext("abc")).resolves.toBeNull();
    await expect(loadStaffModuleWorkspaceContext("0")).resolves.toBeNull();
  });

  it("returns null when the staff module list request fails", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    listModulesMock.mockRejectedValue(new Error("network"));
    await expect(loadStaffModuleWorkspaceContext("103")).resolves.toBeNull();
  });

  it("returns null when the module is not on the staff list and the user has no project access", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    listModulesMock.mockResolvedValue([]);
    loadStaffProjectsMock.mockResolvedValue({ projects: [] } as Awaited<ReturnType<typeof loadStaffProjectsWithTeamsForPage>>);
    await expect(loadStaffModuleWorkspaceContext("104")).resolves.toBeNull();
  });

  it("builds a synthetic module row from project access when staff lacks a list row", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    listModulesMock.mockResolvedValue([]);
    loadStaffProjectsMock.mockResolvedValue({
      projects: [{ moduleName: "Fallback title" }],
    } as Awaited<ReturnType<typeof loadStaffProjectsWithTeamsForPage>>);

    const ctx = await loadStaffModuleWorkspaceContext("105");
    expect(ctx?.parsedModuleId).toBe(105);
    expect(ctx?.moduleRecord).toBeNull();
    expect(ctx?.module.title).toBe("Fallback title");
    expect(ctx?.module.accountRole).toBeUndefined();
    expect(ctx?.isElevated).toBe(false);
  });

  it("skips project lookup for elevated admins and uses a synthetic module title", async () => {
    getCurrentUserMock.mockResolvedValue({
      ...staffUser,
      isStaff: false,
      role: "ADMIN",
      isAdmin: true,
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    listModulesMock.mockResolvedValue([]);

    const ctx = await loadStaffModuleWorkspaceContext("107");
    expect(ctx?.module.title).toBe("Module 107");
    expect(ctx?.module.accountRole).toBe("ADMIN_ACCESS");
    expect(loadStaffProjectsMock).not.toHaveBeenCalled();
  });

  it("returns a full context when the module exists on the staff list", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    listModulesMock.mockResolvedValue([
      { id: "106", title: "Listed", accountRole: "OWNER", teamCount: 1, projectCount: 2 },
    ] as Awaited<ReturnType<typeof listModules>>);

    const ctx = await loadStaffModuleWorkspaceContext("106");
    expect(ctx?.moduleRecord?.title).toBe("Listed");
    expect(ctx?.parsedModuleId).toBe(106);
    expect(ctx?.isEnterpriseAdmin).toBe(false);
  });
});
