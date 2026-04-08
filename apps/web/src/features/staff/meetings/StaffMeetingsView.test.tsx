import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { StaffMeetingsView } from "./StaffMeetingsView";

vi.mock("./components/MeetingStatsPanel", () => ({
  MeetingStatsPanel: ({ stats }: any) => <div data-testid="stats-panel" data-total={stats.totalMeetings} />,
}));

vi.mock("./components/LowAttendanceAlert", () => ({
  LowAttendanceAlert: ({ flaggedMembers }: any) => (
    <div data-testid="low-attendance-alert" data-count={flaggedMembers.length} />
  ),
}));

vi.mock("./components/MeetingList", () => ({
  MeetingList: ({ meetings }: any) => <div data-testid="meeting-list" data-count={meetings.length} />,
}));

vi.mock("./components/AttendanceTable", () => ({
  AttendanceTable: ({ members }: any) => <div data-testid="attendance-table" data-count={members.length} />,
}));

describe("StaffMeetingsView", () => {
  it("renders all four sub-components", () => {
    render(<StaffMeetingsView meetings={[]} absenceThreshold={3} />);

    expect(screen.getByTestId("stats-panel")).toBeInTheDocument();
    expect(screen.getByTestId("low-attendance-alert")).toBeInTheDocument();
    expect(screen.getByTestId("meeting-list")).toBeInTheDocument();
    expect(screen.getByTestId("attendance-table")).toBeInTheDocument();
  });

  it("passes computed stats to MeetingStatsPanel", () => {
    render(<StaffMeetingsView meetings={[]} absenceThreshold={3} />);
    expect(screen.getByTestId("stats-panel")).toHaveAttribute("data-total", "0");
  });

  it("passes meetings to MeetingList", () => {
    render(<StaffMeetingsView meetings={[]} absenceThreshold={3} />);
    expect(screen.getByTestId("meeting-list")).toHaveAttribute("data-count", "0");
  });
});
