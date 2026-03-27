import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import StaffProjectLayout from "./layout";

const breadcrumbProps: Array<Record<string, unknown>> = [];

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/getStaffProjectTeamsCached", () => ({
  getStaffProjectTeams: vi.fn(),
}));

vi.mock("@/features/staff/projects/components/StaffProjectBreadcrumbs", () => ({
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

  it("loads project breadcrumb data when a staff user and numeric project id are provided", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { name: "Project Atlas", moduleId: 22, moduleName: "Module X" },
      teams: [{ id: 3, teamName: "Team Aurora" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffProjectLayout({
      params: Promise.resolve({ projectId: "42" }),
      children: <div data-testid="child">child</div>,
    });
    render(page);

    expect(screen.getByTestId("breadcrumbs")).toHaveTextContent("Project Atlas");
    expect(getStaffProjectTeamsMock).toHaveBeenCalledWith(7, 42);
    expect(breadcrumbProps.at(-1)).toMatchObject({
      projectId: "42",
      projectName: "Project Atlas",
      moduleId: "22",
      moduleName: "Module X",
      teamNamesById: { "3": "Team Aurora" },
    });
  });

  it("keeps fallback labels when project id is invalid", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);

    const page = await StaffProjectLayout({
      params: Promise.resolve({ projectId: "not-a-number" }),
      children: <div />,
    });
    render(page);

    expect(screen.getByTestId("breadcrumbs")).toHaveTextContent("Project not-a-number");
    expect(getStaffProjectTeamsMock).not.toHaveBeenCalled();
    expect(breadcrumbProps.at(-1)).toMatchObject({
      projectId: "not-a-number",
      projectName: "Project not-a-number",
      moduleId: null,
      moduleName: null,
      teamNamesById: {},
    });
  });

  it("keeps fallback labels when project lookup fails", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    getStaffProjectTeamsMock.mockRejectedValue(new Error("boom"));

    const page = await StaffProjectLayout({
      params: Promise.resolve({ projectId: "77" }),
      children: <div />,
    });
    render(page);

    expect(screen.getByTestId("breadcrumbs")).toHaveTextContent("Project 77");
    expect(getStaffProjectTeamsMock).toHaveBeenCalledWith(9, 77);
    expect(breadcrumbProps.at(-1)).toMatchObject({
      teamNamesById: {},
      moduleId: null,
      moduleName: null,
    });
  });
});
