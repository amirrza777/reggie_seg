import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import { listModules } from "@/features/modules/api/client";
import { getCalendarEvents } from "@/features/calendar/api/client";
import DashboardPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/modules/api/client", () => ({
  listModules: vi.fn(),
}));

vi.mock("@/features/calendar/api/client", () => ({
  getCalendarEvents: vi.fn(),
}));

vi.mock("@/features/modules/components/StudentModulesOverviewClient", () => ({
  StudentModulesOverviewClient: ({ canJoin, initialLoadError }: { canJoin: boolean; initialLoadError: string | null }) => (
    <div data-testid="student-modules" data-can-join={String(canJoin)} data-load-error={initialLoadError ?? ""} />
  ),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const listModulesMock = vi.mocked(listModules);
const getCalendarEventsMock = vi.mocked(getCalendarEvents);

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listModulesMock.mockResolvedValue([]);
    getCalendarEventsMock.mockResolvedValue([]);
  });

  it("enables join action for admin users", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 11, role: "ADMIN", isUnassigned: false } as any);

    const page = await DashboardPage();
    render(page);

    expect(screen.getByTestId("student-modules")).toHaveAttribute("data-can-join", "true");
  });

  it("keeps join action disabled for staff users", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 12, role: "STAFF", isUnassigned: false } as any);

    const page = await DashboardPage();
    render(page);

    expect(screen.getByTestId("student-modules")).toHaveAttribute("data-can-join", "false");
  });

  it("renders enterprise recovery panel for unassigned users", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 99, role: "STUDENT", isUnassigned: true } as any);

    const page = await DashboardPage();
    render(page);

    expect(screen.getByText("Enterprise access is required")).toBeInTheDocument();
    expect(listModulesMock).not.toHaveBeenCalled();
    expect(getCalendarEventsMock).not.toHaveBeenCalled();
  });

  it("falls back to empty upcoming row when no user is present", async () => {
    getCurrentUserMock.mockResolvedValue(null as any);

    const page = await DashboardPage();
    render(page);

    expect(screen.queryByTestId("student-modules")).not.toBeInTheDocument();
    expect(screen.getByText("No upcoming deadlines in the next 14 days")).toBeInTheDocument();
  });

  it("shows module load error and filters upcoming events to 14-day window", async () => {
    const now = Date.now();
    const inRangeOne = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();
    const inRangeTwo = new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString();
    const outOfRange = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();

    getCurrentUserMock.mockResolvedValue({ id: 14, role: "STUDENT", isUnassigned: false } as any);
    listModulesMock.mockRejectedValueOnce(new Error("modules unavailable"));
    getCalendarEventsMock.mockResolvedValueOnce([
      { type: "task_open", title: "Inside window", date: inRangeOne, projectName: "Project A" },
      { type: "unknown_type", title: "Unknown type", date: inRangeTwo, projectName: null },
      { type: "task_due", title: "Outside window", date: outOfRange, projectName: "Project B" },
    ] as any);

    const page = await DashboardPage();
    render(page);

    expect(screen.getByTestId("student-modules")).toHaveAttribute("data-can-join", "true");
    expect(screen.getByTestId("student-modules").getAttribute("data-load-error")).toMatch(/could not load modules right now/i);
    expect(screen.getByText("Project A")).toBeInTheDocument();
    expect(screen.getByText("Unknown type")).toBeInTheDocument();
    expect(screen.queryByText("Project B")).not.toBeInTheDocument();
  });
});
