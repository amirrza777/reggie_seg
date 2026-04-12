import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound, redirect } from "next/navigation";
import { listModules } from "@/features/modules/api/client";
import { buildModuleDashboardData } from "@/features/modules/moduleDashboardData";
import type { Module } from "@/features/modules/types";
import { getProjectDeadline, getProjectMarking, getUserProjects } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import ModulePage from "./page";

class RedirectSentinel extends Error {
  constructor(readonly path: string) {
    super(path);
  }
}

class NotFoundSentinel extends Error {}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectSentinel(path);
  }),
  notFound: vi.fn(() => {
    throw new NotFoundSentinel();
  }),
}));

vi.mock("@/features/modules/api/client", () => ({
  listModules: vi.fn(),
}));

vi.mock("@/features/modules/moduleDashboardData", () => ({
  buildModuleDashboardData: vi.fn(),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getUserProjects: vi.fn(),
  getProjectMarking: vi.fn(),
  getProjectDeadline: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/features/modules/components/ModuleDashboard", () => ({
  ModuleDashboardPageView: ({
    dashboard,
    projectsPanel,
  }: {
    dashboard: unknown;
    projectsPanel?: ReactNode;
  }) => (
    <div>
      <div data-testid="module-dashboard-view">{JSON.stringify(dashboard)}</div>
      {projectsPanel ? <div data-testid="projects-panel">{projectsPanel}</div> : null}
    </div>
  ),
}));

const redirectMock = vi.mocked(redirect);
const notFoundMock = vi.mocked(notFound);
const listModulesMock = vi.mocked(listModules);
const buildModuleDashboardDataMock = vi.mocked(buildModuleDashboardData);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const getUserProjectsMock = vi.mocked(getUserProjects);
const getProjectMarkingMock = vi.mocked(getProjectMarking);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);

const moduleRow: Module = {
  id: 17,
  title: "Large-Scale Systems",
  moduleLeadNames: "Staff One",
  accessRole: "ENROLLED",
  code: null,
  teamCount: 0,
  projectCount: 0,
  projectWindowStart: null,
  projectWindowEnd: null,
  hasLinkedProjects: false,
};

const dashboardData = {
  moduleCode: "7CCS17",
  teamCount: 3,
  projectCount: 2,
  hasLinkedProjects: true,
  marksRows: [["Project A", "78", "Published"]] as Array<[string, string, string]>,
  projectPlans: [],
  timelineRows: [],
  expectationRows: [],
  briefParagraphs: ["Brief"],
  readinessParagraphs: ["Ready"],
};

describe("ModulePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 1 } as Awaited<ReturnType<typeof getCurrentUser>>);
    listModulesMock.mockResolvedValue([moduleRow] as Awaited<ReturnType<typeof listModules>>);
    getUserProjectsMock.mockResolvedValue([{ id: 100, name: "Project A", moduleId: 17, archivedAt: null }] as any);
    getProjectMarkingMock.mockResolvedValue({ studentMarking: { mark: 78 }, teamMarking: null } as any);
    getProjectDeadlineMock.mockResolvedValue({
      taskDueDate: null,
      assessmentDueDate: null,
      feedbackDueDate: null,
    } as Awaited<ReturnType<typeof getProjectDeadline>>);
    buildModuleDashboardDataMock.mockReturnValue(dashboardData as ReturnType<typeof buildModuleDashboardData>);
  });

  it("redirects unauthenticated users to login", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(
      ModulePage({
        params: Promise.resolve({ moduleId: "17" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("calls notFound when modules fail to load or target module does not exist", async () => {
    listModulesMock.mockRejectedValue(new Error("modules api down"));

    await expect(
      ModulePage({
        params: Promise.resolve({ moduleId: "999" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSentinel);

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("renders the dashboard view with built data and a projects panel linking to module projects", async () => {
    const page = await ModulePage({
      params: Promise.resolve({ moduleId: "17" }),
    });
    render(page);

    expect(buildModuleDashboardDataMock).toHaveBeenCalledWith(
      moduleRow,
      [["Project A", "78", "Published"]],
    );
    expect(screen.getByTestId("module-dashboard-view")).toHaveTextContent(
      '"marksRows":[["Project A","78","Published"]]',
    );
    expect(screen.getByTestId("projects-panel")).toHaveTextContent("Projects in this module");
    expect(screen.getByRole("link", { name: /Project A/i })).toHaveAttribute("href", "/projects/100");
  });

  it("falls back to not-available marks when project marking fetch fails", async () => {
    getProjectMarkingMock.mockRejectedValueOnce(new Error("marking unavailable"));

    await ModulePage({
      params: Promise.resolve({ moduleId: "17" }),
    });

    expect(buildModuleDashboardDataMock).toHaveBeenCalledWith(
      moduleRow,
      [["Project A", "Not available", "In progress"]],
    );
  });
});
