import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { buildModuleDashboardData } from "@/features/modules/moduleDashboardData";
import {
  loadStaffModuleWorkspaceContext,
  resolveStaffModuleWorkspaceAccess,
} from "@/features/modules/staffModuleWorkspaceLayoutData";
import { getProjectDeadline, getStaffProjects } from "@/features/projects/api/client";
import StaffModuleOverviewPage from "./page";

class RedirectSentinel extends Error {}

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new RedirectSentinel();
  }),
}));

vi.mock("@/features/modules/staffModuleWorkspaceLayoutData", () => ({
  loadStaffModuleWorkspaceContext: vi.fn(),
  resolveStaffModuleWorkspaceAccess: vi.fn(),
}));

vi.mock("@/features/modules/moduleDashboardData", () => ({
  buildModuleDashboardData: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getStaffProjects: vi.fn(),
  getProjectDeadline: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/features/modules/components/dashboard/ModuleDashboard", () => ({
  ModuleDashboardPageView: ({ dashboard }: { dashboard: unknown }) => (
    <div data-testid="module-dashboard-view">{JSON.stringify(dashboard)}</div>
  ),
}));

const redirectMock = vi.mocked(redirect);
const loadStaffModuleWorkspaceContextMock = vi.mocked(loadStaffModuleWorkspaceContext);
const resolveStaffModuleWorkspaceAccessMock = vi.mocked(resolveStaffModuleWorkspaceAccess);
const buildModuleDashboardDataMock = vi.mocked(buildModuleDashboardData);
const getStaffProjectsMock = vi.mocked(getStaffProjects);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);

describe("StaffModuleOverviewPage", () => {
  it("redirects when module context is unavailable", async () => {
    loadStaffModuleWorkspaceContextMock.mockResolvedValueOnce(null);

    await expect(
      StaffModuleOverviewPage({
        params: Promise.resolve({ moduleId: "22" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/staff/modules");
  });

  it("renders module dashboard with timeline rows derived from project deadlines", async () => {
    loadStaffModuleWorkspaceContextMock.mockResolvedValueOnce({
      user: { id: 7 },
      moduleId: "22",
      parsedModuleId: 22,
      moduleRecord: null,
      module: { id: "22", title: "Systems Project" },
      isElevated: false,
      isEnterpriseAdmin: false,
    } as any);
    resolveStaffModuleWorkspaceAccessMock.mockReturnValueOnce({
      listSlot: "owner",
      orgOrPlatformAdmin: false,
      staffModuleSetup: false,
      enterpriseModuleEditor: false,
      createProjectInModule: false,
      isArchived: false,
      canEdit: false,
      canCreateProject: false,
    });
    buildModuleDashboardDataMock.mockReturnValueOnce({
      moduleCode: "MOD-22",
      teamCount: 0,
      projectCount: 0,
      hasLinkedProjects: false,
      marksRows: [],
      timelineRows: [
        {
          whenLabel: "Scheduled",
          whenTone: "upcoming",
          dateLabel: "manual",
          projectName: "",
          activity: "Manual timeline",
          occursAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
      expectationRows: [],
      briefParagraphs: [],
      readinessParagraphs: [],
    } as ReturnType<typeof buildModuleDashboardData>);
    getStaffProjectsMock.mockResolvedValueOnce([
      { id: 101, name: "Project Alpha", moduleId: 22, moduleName: "Systems Project" },
    ] as any);
    getProjectDeadlineMock.mockResolvedValueOnce({
      taskOpenDate: null,
      taskDueDate: "2026-02-20T09:00:00.000Z",
      assessmentOpenDate: null,
      assessmentDueDate: null,
      feedbackOpenDate: null,
      feedbackDueDate: null,
      isOverridden: false,
    } as Awaited<ReturnType<typeof getProjectDeadline>>);

    const page = await StaffModuleOverviewPage({
      params: Promise.resolve({ moduleId: "22" }),
    });
    render(page);

    expect(getStaffProjectsMock).toHaveBeenCalledWith(7, { moduleId: 22 });
    expect(getProjectDeadlineMock).toHaveBeenCalledWith(7, 101);
    expect(screen.getByTestId("module-dashboard-view")).toHaveTextContent('"activity":"Task due"');
    expect(screen.getByTestId("module-dashboard-view")).not.toHaveTextContent("Manual timeline");
  });
});
