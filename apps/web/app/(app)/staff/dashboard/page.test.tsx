import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { listModules } from "@/features/modules/api/client";
import { getStaffProjectsForMarking, getStaffProjects } from "@/features/projects/api/client";
import { getModulesSummary } from "@/features/staff/peerAssessments/api/client";
import StaffDashboardPage from "./page";

class RedirectSentinel extends Error {
  constructor(readonly path: string) {
    super(path);
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectSentinel(path);
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/modules/api/client", () => ({
  listModules: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getStaffProjectsForMarking: vi.fn(),
  getStaffProjects: vi.fn(),
}));

vi.mock("@/features/staff/peerAssessments/api/client", () => ({
  getModulesSummary: vi.fn(),
}));

vi.mock("@/features/staff/dashboard/components/StaffActivityDonutChart", () => ({
  StaffActivityDonutChart: ({
    active,
    lowActivity,
    inactive,
  }: {
    active: number;
    lowActivity: number;
    inactive: number;
  }) => <div data-testid="activity-donut">{`${active}/${lowActivity}/${inactive}`}</div>,
}));

vi.mock("@/features/staff/dashboard/components/StaffStudentsBarChart", () => ({
  StaffStudentsBarChart: ({ projects }: { projects: Array<{ name: string; students: number }> }) => (
    <div data-testid="students-bar-chart">{projects.map((project) => `${project.name}:${project.students}`).join(",")}</div>
  ),
}));

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ title, children }: { title: string; children: ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock("@/shared/ui/Placeholder", () => ({
  Placeholder: ({ title, description }: { title: string; description: string }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  ),
}));

vi.mock("@/shared/ui/Table", () => ({
  Table: ({ headers, rows }: { headers: string[]; rows: Array<[string, ReactNode, string, string]> }) => (
    <div data-testid="table">
      <div>{headers.join("|")}</div>
      {rows.map((row, index) => (
        <div key={index} data-testid={`row-${index}`}>
          <span>{row[0]}</span>
          {row[1]}
          <span>{row[2]}</span>
          <span>{row[3]}</span>
        </div>
      ))}
    </div>
  ),
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const listModulesMock = vi.mocked(listModules);
const getStaffProjectsForMarkingMock = vi.mocked(getStaffProjectsForMarking);
const getStaffProjectsMock = vi.mocked(getStaffProjects);
const getModulesSummaryMock = vi.mocked(getModulesSummary);

describe("StaffDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStaffProjectsForMarkingMock.mockResolvedValue([]);
    getStaffProjectsMock.mockResolvedValue([]);
    getModulesSummaryMock.mockResolvedValue([]);
  });

  it("redirects users without staff/admin access", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, isStaff: false, role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(StaffDashboardPage()).rejects.toBeInstanceOf(RedirectSentinel);
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("shows module loading error when API fails", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 2, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    listModulesMock.mockRejectedValue(new Error("modules unavailable"));

    const page = await StaffDashboardPage();
    render(page);

    expect(listModulesMock).toHaveBeenCalledWith(2, { scope: "staff" });
    expect(screen.getByText("Could not load your modules right now. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /my modules/i })).toHaveAttribute("href", "/staff/modules");
    expect(screen.queryByRole("link", { name: /analytics/i })).not.toBeInTheDocument();
  });

  it("shows empty-module state when no modules are assigned", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    listModulesMock.mockResolvedValue([] as Awaited<ReturnType<typeof listModules>>);

    const page = await StaffDashboardPage();
    render(page);

    expect(screen.getByText("No modules are currently assigned to your account.")).toBeInTheDocument();
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
  });

  it("renders module table rows with computed code and pluralized counts", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 4, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    listModulesMock.mockResolvedValue([
      { id: "10", title: "Cloud Engineering", teamCount: 1, projectCount: 2 },
      { id: "CSX", title: "Research Module", teamCount: 3, projectCount: 1 },
    ] as Awaited<ReturnType<typeof listModules>>);

    const page = await StaffDashboardPage();
    render(page);

    expect(screen.getByTestId("table")).toBeInTheDocument();
    expect(screen.getByTestId("row-0")).toHaveTextContent("MOD-10");
    expect(screen.getByTestId("row-0")).toHaveTextContent("1 team");
    expect(screen.getByTestId("row-0")).toHaveTextContent("2 projects");
    expect(screen.getByTestId("row-1")).toHaveTextContent("CSX");
    expect(screen.getByTestId("row-1")).toHaveTextContent("3 teams");
    expect(screen.getByTestId("row-1")).toHaveTextContent("1 project");
  });

  it("renders overview analytics cards, charts, and attention sections when data is available", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 10, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    listModulesMock.mockResolvedValue([
      { id: "1", title: "Cloud", teamCount: 2, projectCount: 1, code: "4CCS1" },
      { id: "2", title: "AI", teamCount: 1, projectCount: 2, code: "4CCS2" },
    ] as Awaited<ReturnType<typeof listModules>>);
    getStaffProjectsForMarkingMock.mockResolvedValue([
      {
        id: 11,
        name: "Project Atlas",
        moduleId: 1,
        moduleName: "Cloud",
        teams: [
          { id: 100, teamName: "Team Red", projectId: 11, inactivityFlag: "RED", studentCount: 3 },
          { id: 101, teamName: "Team Yellow", projectId: 11, inactivityFlag: "YELLOW", studentCount: 2 },
          { id: 102, teamName: "Team Green", projectId: 11, inactivityFlag: "NONE", studentCount: 4 },
        ],
      },
      {
        id: 12,
        name: "Project Borealis",
        moduleId: 2,
        moduleName: "AI",
        teams: [{ id: 103, teamName: "Team Blue", projectId: 12, inactivityFlag: "NONE", studentCount: 1 }],
      },
    ] as Awaited<ReturnType<typeof getStaffProjectsForMarking>>);
    getStaffProjectsMock.mockResolvedValue([
      {
        id: 11,
        name: "Project Atlas",
        moduleId: 1,
        moduleName: "Cloud",
        teamCount: 3,
        hasGithubRepo: true,
        daysOld: 10,
        membersTotal: 8,
        membersConnected: 6,
        dateRangeStart: null,
        dateRangeEnd: null,
        githubIntegrationPercent: 100,
        trelloBoardsLinkedPercent: 0,
        trelloBoardsLinkedCount: 0,
        peerAssessmentsSubmittedPercent: 0,
        peerAssessmentsSubmittedCount: 0,
        peerAssessmentsExpectedCount: 0,
      },
      {
        id: 12,
        name: "Project Borealis",
        moduleId: 2,
        moduleName: "AI",
        teamCount: 1,
        hasGithubRepo: false,
        daysOld: 12,
        membersTotal: 4,
        membersConnected: 2,
        dateRangeStart: null,
        dateRangeEnd: null,
        githubIntegrationPercent: 0,
        trelloBoardsLinkedPercent: 0,
        trelloBoardsLinkedCount: 0,
        peerAssessmentsSubmittedPercent: 0,
        peerAssessmentsSubmittedCount: 0,
        peerAssessmentsExpectedCount: 0,
      },
    ] as Awaited<ReturnType<typeof getStaffProjects>>);
    getModulesSummaryMock.mockResolvedValue([
      { title: "Cloud", submitted: 10, expected: 12 },
      { title: "AI", submitted: 6, expected: 8 },
    ] as Awaited<ReturnType<typeof getModulesSummary>>);

    const page = await StaffDashboardPage();
    render(page);

    expect(screen.getByText("Staff Overview")).toBeInTheDocument();
    expect(screen.getByText("2 modules")).toBeInTheDocument();
    expect(screen.getByText("3 projects")).toBeInTheDocument();
    expect(screen.getByText("3 teams")).toBeInTheDocument();
    expect(screen.getByText("10 students")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();

    expect(screen.getByTestId("students-bar-chart")).toHaveTextContent("Project Atlas:9,Project Borealis:1");
    expect(screen.getByTestId("activity-donut")).toHaveTextContent("2/1/1");
    expect(screen.getByText("Peer assessment completion")).toBeInTheDocument();
    expect(screen.getByText("10/12")).toBeInTheDocument();
    expect(screen.getByText("6/8")).toBeInTheDocument();
    expect(screen.getByText("Teams needing attention")).toBeInTheDocument();
    expect(screen.getByText("Low activity teams")).toBeInTheDocument();
    expect(screen.queryByText(/no inactivity flags raised/i)).not.toBeInTheDocument();
  });

  it("shows team-health success state when all teams are healthy", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 11, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    listModulesMock.mockResolvedValue([{ id: "42", title: "Testing", teamCount: 1, projectCount: 1 }] as Awaited<ReturnType<typeof listModules>>);
    getStaffProjectsForMarkingMock.mockResolvedValue([
      {
        id: 55,
        name: "Project Healthy",
        moduleId: 42,
        moduleName: "Testing",
        teams: [{ id: 201, teamName: "Team Healthy", projectId: 55, inactivityFlag: "NONE", studentCount: 5 }],
      },
    ] as Awaited<ReturnType<typeof getStaffProjectsForMarking>>);

    const page = await StaffDashboardPage();
    render(page);

    expect(screen.getByText("Team health")).toBeInTheDocument();
    expect(screen.getByText("All 1 teams are active — no inactivity flags raised.")).toBeInTheDocument();
    expect(screen.queryByText("Teams needing attention")).not.toBeInTheDocument();
    expect(screen.queryByText("Low activity teams")).not.toBeInTheDocument();
  });

  it("falls back to empty arrays when marking/project/peer summary calls fail", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 12, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    listModulesMock.mockResolvedValue([{ id: "5", title: "Fallback", teamCount: 0, projectCount: 0 }] as Awaited<ReturnType<typeof listModules>>);
    getStaffProjectsForMarkingMock.mockRejectedValue(new Error("marking unavailable"));
    getStaffProjectsMock.mockRejectedValue(new Error("projects unavailable"));
    getModulesSummaryMock.mockRejectedValue(new Error("peer unavailable"));

    const page = await StaffDashboardPage();
    render(page);

    expect(screen.getByRole("heading", { name: "My Modules" })).toBeInTheDocument();
    expect(screen.queryByTestId("activity-donut")).not.toBeInTheDocument();
    expect(screen.queryByText("Peer assessment completion")).not.toBeInTheDocument();
    expect(screen.queryByText("Teams needing attention")).not.toBeInTheDocument();
  });
});
