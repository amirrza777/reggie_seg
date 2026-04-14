import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UpcomingList } from "./UpcomingList";

const events = [
  {
    id: "1",
    title: "Kickoff",
    projectName: "Project Phoenix",
    date: "2026-03-05T10:00:00.000Z",
    type: "meeting",
  },
  {
    id: "2",
    title: "Deadline",
    date: "2026-03-07T10:00:00.000Z",
    type: "task_due",
  },
] as const;

describe("UpcomingList", () => {
  it("renders empty state when there are no events", () => {
    render(<UpcomingList events={[]} title="Events in March" />);

    expect(screen.getByRole("heading", { level: 3, name: "Events in March" })).toBeInTheDocument();
    expect(screen.getByText("No events.")).toBeInTheDocument();
  });

  it("renders badges, formatted dates, and falls back to event title", () => {
    render(<UpcomingList events={[...events] as any} />);

    expect(screen.getByRole("heading", { level: 3, name: "Upcoming" })).toBeInTheDocument();
    expect(screen.getByText("Project Phoenix")).toBeInTheDocument();
    expect(screen.getByText("Deadline")).toBeInTheDocument();
    expect(screen.getByText("Meeting")).toHaveClass("calendar-badge", "calendar-badge--purple");
    expect(screen.getByText("Task Due")).toHaveClass("calendar-badge", "calendar-badge--danger");
    expect(screen.getByText("5 Mar 2026")).toBeInTheDocument();
  });
});
