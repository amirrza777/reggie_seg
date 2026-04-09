import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LowAttendanceAlert } from "./LowAttendanceAlert";

const FLAGGED_MEMBER = { id: 1, firstName: "Alice", lastName: "Smith", consecutiveAbsences: 4 };

describe("LowAttendanceAlert", () => {
  it("renders nothing when there are no flagged members", () => {
    const { container } = render(<LowAttendanceAlert flaggedMembers={[]} absenceThreshold={3} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows singular heading for one flagged member", () => {
    render(<LowAttendanceAlert flaggedMembers={[FLAGGED_MEMBER]} absenceThreshold={3} />);
    expect(screen.getByText(/1 member/)).toBeInTheDocument();
    expect(screen.getByText(/3\+ consecutive absences/)).toBeInTheDocument();
  });

  it("shows plural heading for multiple flagged members", () => {
    const second = { id: 2, firstName: "Bob", lastName: "Jones", consecutiveAbsences: 3 };
    render(<LowAttendanceAlert flaggedMembers={[FLAGGED_MEMBER, second]} absenceThreshold={3} />);
    expect(screen.getByText(/2 members/)).toBeInTheDocument();
  });

  it("renders each flagged member's name and absence count", () => {
    render(<LowAttendanceAlert flaggedMembers={[FLAGGED_MEMBER]} absenceThreshold={3} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("4 in a row")).toBeInTheDocument();
  });
});
