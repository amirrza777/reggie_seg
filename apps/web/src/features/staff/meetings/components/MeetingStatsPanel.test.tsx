import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MeetingStatsPanel } from "./MeetingStatsPanel";

describe("MeetingStatsPanel", () => {
  it("renders total meetings, avg attendance, and on-time rate", () => {
    render(<MeetingStatsPanel stats={{ totalMeetings: 10, avgAttendanceRate: 0.75, onTimeRate: 0.5 }} />);

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("rounds rates to the nearest percent", () => {
    render(<MeetingStatsPanel stats={{ totalMeetings: 1, avgAttendanceRate: 0.666, onTimeRate: 0.333 }} />);

    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
  });
});
