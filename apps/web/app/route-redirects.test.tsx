import { describe, expect, it, vi, beforeEach } from "vitest";

class RedirectSentinel extends Error {
  path: string;
  constructor(path: string) {
    super(`redirect:${path}`);
    this.path = path;
  }
}

const redirectMock = vi.fn((path: string) => {
  throw new RedirectSentinel(path);
});
const getCurrentUserMock = vi.fn();
const isElevatedStaffMock = vi.fn();
const getDefaultSpaceOverviewPathMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: () => getCurrentUserMock(),
  isElevatedStaff: (user: unknown) => isElevatedStaffMock(user),
}));

vi.mock("@/shared/auth/default-space", () => ({
  getDefaultSpaceOverviewPath: (user: unknown) => getDefaultSpaceOverviewPathMock(user),
}));

import ModulesPage from "./(app)/modules/page";
import TeamHealthPage from "./(app)/staff/health/page";
import StaffIndexPage from "./(app)/staff/page";
import StaffProjectsPage from "./(app)/staff/projects/page";
import StaffQuestionnairesLayout from "./(app)/staff/questionnaires/layout";
import AppHomePage from "./app-home/page";

describe("route redirect guards", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getCurrentUserMock.mockReset();
    isElevatedStaffMock.mockReset();
    getDefaultSpaceOverviewPathMock.mockReset();
  });

  it("redirects modules route to dashboard", async () => {
    await expect(ModulesPage()).rejects.toMatchObject({ path: "/dashboard" });
  });

  it("redirects non-elevated team-health users to dashboard", async () => {
    const user = { id: 1, role: "STUDENT" };
    getCurrentUserMock.mockResolvedValue(user);
    isElevatedStaffMock.mockReturnValue(false);

    await expect(TeamHealthPage()).rejects.toMatchObject({ path: "/dashboard" });
  });

  it("redirects elevated team-health users to staff modules", async () => {
    const user = { id: 1, role: "STAFF" };
    getCurrentUserMock.mockResolvedValue(user);
    isElevatedStaffMock.mockReturnValue(true);

    await expect(TeamHealthPage()).rejects.toMatchObject({ path: "/staff/modules" });
  });

  it("redirects unauthorised staff index visitors to dashboard", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, role: "STUDENT", isStaff: false });

    await expect(StaffIndexPage()).rejects.toMatchObject({ path: "/dashboard" });
  });

  it("redirects staff index users to staff dashboard", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 2, role: "STAFF", isStaff: true });

    await expect(StaffIndexPage()).rejects.toMatchObject({ path: "/staff/dashboard" });
  });

  it("redirects staff projects index to staff modules", async () => {
    await expect(StaffProjectsPage()).rejects.toMatchObject({ path: "/staff/modules" });
  });

  it("redirects non-elevated questionnaire layout users", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3, role: "STUDENT" });
    isElevatedStaffMock.mockReturnValue(false);

    await expect(StaffQuestionnairesLayout({ children: <div>child</div> })).rejects.toMatchObject({
      path: "/dashboard",
    });
  });

  it("returns children for elevated questionnaire layout users", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 4, role: "STAFF" });
    isElevatedStaffMock.mockReturnValue(true);

    const result = await StaffQuestionnairesLayout({ children: <div data-testid="child">child</div> });
    expect(result).toEqual(<div data-testid="child">child</div>);
  });

  it("redirects anonymous app-home users to login", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(AppHomePage()).rejects.toMatchObject({ path: "/login" });
  });

  it("redirects app-home users to their default space", async () => {
    const user = { id: 8, role: "STAFF", isStaff: true };
    getCurrentUserMock.mockResolvedValue(user);
    getDefaultSpaceOverviewPathMock.mockReturnValue("/staff/dashboard");

    await expect(AppHomePage()).rejects.toMatchObject({ path: "/staff/dashboard" });
    expect(getDefaultSpaceOverviewPathMock).toHaveBeenCalledWith(user);
  });
});
