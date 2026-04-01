import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound, redirect } from "next/navigation";
import { listModules } from "@/features/modules/api/client";
import { buildModuleDashboardData, resolveModuleDashboardTab } from "@/features/modules/moduleDashboardData";
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
  resolveModuleDashboardTab: vi.fn(),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/modules/components/ModuleDashboardSections", () => ({
  ModuleTabNav: ({ moduleId, activeTab }: { moduleId: number; activeTab: string }) => (
    <div data-testid="module-tab-nav" data-module-id={moduleId} data-active-tab={activeTab} />
  ),
  ModuleSummaryCard: ({ title }: { title: string }) => <div data-testid="module-summary">{title}</div>,
  ModuleExpectationsSection: ({ briefParagraphs }: { briefParagraphs: string[] }) => (
    <div data-testid="expectations-section">{briefParagraphs.join(",")}</div>
  ),
  ModuleMarksSection: ({ marksRows }: { marksRows: Array<{ student: string }> }) => (
    <div data-testid="marks-section">{marksRows.length}</div>
  ),
}));

const redirectMock = vi.mocked(redirect);
const notFoundMock = vi.mocked(notFound);
const listModulesMock = vi.mocked(listModules);
const buildModuleDashboardDataMock = vi.mocked(buildModuleDashboardData);
const resolveModuleDashboardTabMock = vi.mocked(resolveModuleDashboardTab);
const getCurrentUserMock = vi.mocked(getCurrentUser);

const moduleRow = {
  id: 17,
  title: "Large-Scale Systems",
  moduleLeadNames: "Staff One",
};

const dashboardData = {
  moduleCode: "7CCS17",
  teamCount: 3,
  projectCount: 2,
  hasLinkedProjects: true,
  marksRows: [["Project A", "78", "Published"]],
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
    buildModuleDashboardDataMock.mockReturnValue(dashboardData as ReturnType<typeof buildModuleDashboardData>);
  });

  it("redirects unauthenticated users to login", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    resolveModuleDashboardTabMock.mockReturnValue("expectations");

    await expect(
      ModulePage({
        params: Promise.resolve({ moduleId: "17" }),
        searchParams: Promise.resolve({ tab: "expectations" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("calls notFound when modules fail to load or target module does not exist", async () => {
    resolveModuleDashboardTabMock.mockReturnValue("marks");
    listModulesMock.mockRejectedValue(new Error("modules api down"));

    await expect(
      ModulePage({
        params: Promise.resolve({ moduleId: "999" }),
        searchParams: Promise.resolve({ tab: "marks" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSentinel);

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("renders expectations tab content when activeTab resolves to expectations", async () => {
    resolveModuleDashboardTabMock.mockReturnValue("expectations");

    const page = await ModulePage({
      params: Promise.resolve({ moduleId: "17" }),
      searchParams: Promise.resolve({ tab: "expectations" }),
    });
    render(page);

    expect(screen.getByTestId("module-tab-nav")).toHaveAttribute("data-active-tab", "expectations");
    expect(screen.getByTestId("module-summary")).toHaveTextContent("Large-Scale Systems");
    expect(screen.getByTestId("expectations-section")).toHaveTextContent("Brief");
    expect(screen.queryByTestId("marks-section")).not.toBeInTheDocument();
  });

  it("renders marks tab content when activeTab resolves to marks", async () => {
    resolveModuleDashboardTabMock.mockReturnValue("marks");

    const page = await ModulePage({
      params: Promise.resolve({ moduleId: "17" }),
      searchParams: Promise.resolve({ tab: "marks" }),
    });
    render(page);

    expect(screen.getByTestId("module-tab-nav")).toHaveAttribute("data-active-tab", "marks");
    expect(screen.getByTestId("marks-section")).toHaveTextContent("1");
    expect(screen.queryByTestId("expectations-section")).not.toBeInTheDocument();
  });
});
