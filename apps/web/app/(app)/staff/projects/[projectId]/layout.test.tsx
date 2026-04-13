import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import { ApiError } from "@/shared/api/errors";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import StaffProjectLayout from "./layout";

const breadcrumbProps: Array<Record<string, unknown>> = [];

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
  usePathname: () => "/staff/projects/42",
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

vi.mock("@/features/staff/projects/components/navigation/StaffProjectBreadcrumbs", () => ({
  StaffProjectBreadcrumbs: (props: Record<string, unknown>) => {
    breadcrumbProps.push(props);
    return <div data-testid="breadcrumbs">{String(props.projectName)}</div>;
  },
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);

describe("StaffProjectLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    breadcrumbProps.length = 0;
  });

  it("loads project shell when a staff user and project teams load successfully", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: {
        name: "Project Atlas",
        moduleId: 22,
        moduleName: "Module X",
        moduleArchivedAt: null,
        projectArchivedAt: null,
        viewerAccessLabel: "Staff access",
        canManageProjectSettings: true,
      },
      teams: [{ id: 3, teamName: "Team Aurora", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffProjectLayout({
      params: Promise.resolve({ projectId: "42" }),
      children: <div data-testid="child">child</div>,
    });
    render(page);

    expect(screen.getByTestId("breadcrumbs")).toHaveTextContent("Project Atlas");
    expect(screen.getByText("PROJECT")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Project Atlas" })).toBeInTheDocument();
    expect(getStaffProjectTeamsMock).toHaveBeenCalledWith(7, 42);
    expect(breadcrumbProps.at(-1)).toMatchObject({
      projectId: "42",
      projectName: "Project Atlas",
      moduleId: "22",
      moduleName: "Module X",
      teamNamesById: { "3": "Team Aurora" },
    });
  });

  it("redirects to login when user is missing", async () => {
    getCurrentUserMock.mockResolvedValue(null as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(
      StaffProjectLayout({ params: Promise.resolve({ projectId: "100" }), children: <div /> }),
    ).rejects.toThrow("REDIRECT:/login");

    expect(getStaffProjectTeamsMock).not.toHaveBeenCalled();
  });

  it("redirects to dashboard when user is not staff or admin", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 3,
      isStaff: false,
      role: "STUDENT",
    } as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(
      StaffProjectLayout({ params: Promise.resolve({ projectId: "100" }), children: <div /> }),
    ).rejects.toThrow("REDIRECT:/dashboard");

    expect(getStaffProjectTeamsMock).not.toHaveBeenCalled();
  });

  it("redirects to modules when project id is not a positive integer", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(
      StaffProjectLayout({ params: Promise.resolve({ projectId: "not-a-number" }), children: <div /> }),
    ).rejects.toThrow("REDIRECT:/staff/modules");

    expect(getStaffProjectTeamsMock).not.toHaveBeenCalled();
  });

  it("redirects to modules on 404 from teams API", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockRejectedValue(new ApiError("missing", { status: 404 }));

    await expect(
      StaffProjectLayout({ params: Promise.resolve({ projectId: "77" }), children: <div /> }),
    ).rejects.toThrow("REDIRECT:/staff/modules");
  });

  it("redirects to project overview on 403 from teams API", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockRejectedValue(new ApiError("forbidden", { status: 403 }));

    await expect(
      StaffProjectLayout({ params: Promise.resolve({ projectId: "77" }), children: <div /> }),
    ).rejects.toThrow("REDIRECT:/staff/projects/77");
  });

  it("rethrows non-API errors from teams load", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockRejectedValue(new Error("boom"));

    await expect(
      StaffProjectLayout({ params: Promise.resolve({ projectId: "77" }), children: <div /> }),
    ).rejects.toThrow("boom");
  });

  it("loads project data for admin users even when isStaff is false", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 12, isStaff: false, role: "ADMIN" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: {
        name: "Project Zenith",
        moduleId: 41,
        moduleName: "Module Z",
        moduleArchivedAt: null,
        projectArchivedAt: null,
        viewerAccessLabel: "Staff access",
        canManageProjectSettings: false,
      },
      teams: [{ id: 5, teamName: "Team Polaris", allocations: [] }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffProjectLayout({
      params: Promise.resolve({ projectId: "88" }),
      children: <div />,
    });
    render(page);

    expect(getStaffProjectTeamsMock).toHaveBeenCalledWith(12, 88);
    expect(screen.getByTestId("breadcrumbs")).toHaveTextContent("Project Zenith");
  });
});
