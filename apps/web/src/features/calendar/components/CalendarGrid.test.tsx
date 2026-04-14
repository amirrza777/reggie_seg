import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarGrid } from "./CalendarGrid";

vi.mock("lucide-react", () => ({
  ChevronLeft: () => <span data-testid="chevron-left" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
}));

vi.mock("./UpcomingList", () => ({
  UpcomingList: ({ events, title }: { events: unknown[]; title: string }) => (
    <div data-testid="upcoming-list" data-count={events.length} data-title={title} />
  ),
}));

const events = [
  {
    id: "1",
    title: "Kickoff",
    date: "2026-03-05T10:00:00.000Z",
    type: "meeting",
  },
  {
    id: "2",
    title: "Task opens",
    date: "2026-04-01T10:00:00.000Z",
    type: "task_open",
  },
] as any;

describe("CalendarGrid", () => {
  it("renders month view, legend, and toggles selected-date upcoming events", () => {
    const { container } = render(
      <CalendarGrid events={events} initialDate="2026-03-01T00:00:00.000Z" showLegend showUpcomingList />,
    );

    expect(screen.getByText("March 2026")).toBeInTheDocument();
    expect(screen.getByTestId("upcoming-list")).toHaveAttribute("data-title", "Events in March");
    expect(screen.getByTestId("upcoming-list")).toHaveAttribute("data-count", "1");
    expect(screen.getByText("team allocation questionnaire due")).toBeInTheDocument();

    const dayFive = Array.from(container.querySelectorAll("button.calendar-cell")).find((button) =>
      button.textContent?.includes("5"),
    );
    expect(dayFive).toBeTruthy();

    fireEvent.click(dayFive as HTMLButtonElement);
    expect(screen.getByTestId("upcoming-list")).toHaveAttribute("data-title", "Events on 2026-03-05");
    expect(screen.getByTestId("upcoming-list")).toHaveAttribute("data-count", "1");

    fireEvent.click(dayFive as HTMLButtonElement);
    expect(screen.getByTestId("upcoming-list")).toHaveAttribute("data-title", "Events in March");

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText("April 2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByText("March 2026")).toBeInTheDocument();
  });

  it("supports month navigation boundaries and hide options", () => {
    const { unmount, container } = render(
      <CalendarGrid events={events} initialDate="2026-01-15T00:00:00.000Z" showLegend={false} showUpcomingList={false} />,
    );

    expect(container.querySelector(".calendar-wrapper")).toHaveClass("calendar-wrapper--full");
    expect(screen.queryByTestId("upcoming-list")).not.toBeInTheDocument();
    expect(screen.queryByText("task open")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByText("December 2025")).toBeInTheDocument();

    unmount();
    render(<CalendarGrid events={events} initialDate="2026-12-01T00:00:00.000Z" />);
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText("January 2027")).toBeInTheDocument();
  });

  it("shows an empty selected-day list when a day has no events", () => {
    const { container } = render(
      <CalendarGrid events={events} initialDate="2026-03-01T00:00:00.000Z" showLegend showUpcomingList />,
    );

    const dayTwenty = Array.from(container.querySelectorAll("button.calendar-cell")).find((button) =>
      button.textContent?.includes("20"),
    );
    expect(dayTwenty).toBeTruthy();

    fireEvent.click(dayTwenty as HTMLButtonElement);
    expect(screen.getByTestId("upcoming-list")).toHaveAttribute("data-title", "Events on 2026-03-20");
    expect(screen.getByTestId("upcoming-list")).toHaveAttribute("data-count", "0");
  });
});
