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
  StudentModulesOverviewClient: ({ canJoin }: { canJoin: boolean }) => (
    <div data-testid="student-modules" data-can-join={String(canJoin)} />
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
});
