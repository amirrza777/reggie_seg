import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import { getCalendarEvents } from "@/features/calendar/api/client";
import CalendarPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/calendar/api/client", () => ({
  getCalendarEvents: vi.fn(),
}));

vi.mock("@/features/calendar/components/CalendarGrid", () => ({
  CalendarGrid: ({ events }: { events: unknown[] }) => <div data-testid="calendar-grid" data-count={events.length} />,
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getCalendarEventsMock = vi.mocked(getCalendarEvents);

describe("CalendarPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 7 } as any);
    getCalendarEventsMock.mockResolvedValue([{ id: "1" }] as any);
  });

  it("loads events for authenticated users", async () => {
    const page = await CalendarPage();
    render(page);

    expect(getCalendarEventsMock).toHaveBeenCalledWith(7);
    expect(screen.getByTestId("calendar-grid")).toHaveAttribute("data-count", "1");
    expect(screen.getByRole("heading", { name: "Calendar" })).toBeInTheDocument();
  });

  it("falls back to empty events when user is missing or event load fails", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null as any);
    const anonymousPage = await CalendarPage();
    render(anonymousPage);
    expect(screen.getByTestId("calendar-grid")).toHaveAttribute("data-count", "0");

    getCurrentUserMock.mockResolvedValueOnce({ id: 99 } as any);
    getCalendarEventsMock.mockRejectedValueOnce(new Error("down"));
    const failedPage = await CalendarPage();
    render(failedPage);
    expect(screen.getAllByTestId("calendar-grid")[1]).toHaveAttribute("data-count", "0");
  });
});
