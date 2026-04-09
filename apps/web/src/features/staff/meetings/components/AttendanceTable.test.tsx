import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AttendanceTable } from "./AttendanceTable";
import type { MemberAttendance } from "../attendance";

function makeMember(overrides: Partial<MemberAttendance> = {}): MemberAttendance {
  return {
    id: 1,
    firstName: "Alice",
    lastName: "Smith",
    attended: 3,
    total: 4,
    lastStatus: "on_time",
    atRisk: false,
    ...overrides,
  };
}

describe("AttendanceTable", () => {
  it("shows empty message when there are no members", () => {
    render(<AttendanceTable members={[]} />);
    expect(screen.getByText("No attendance data recorded yet.")).toBeInTheDocument();
  });

  it("renders member name, attendance count, rate, and last status", () => {
    render(<AttendanceTable members={[makeMember()]} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("3 / 4")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("On time")).toBeInTheDocument();
  });

  it("shows At risk badge for members who are at risk", () => {
    render(<AttendanceTable members={[makeMember({ atRisk: true })]} />);
    expect(screen.getByText("At risk")).toBeInTheDocument();
  });

  it("does not show At risk badge for members who are not at risk", () => {
    render(<AttendanceTable members={[makeMember({ atRisk: false })]} />);
    expect(screen.queryByText("At risk")).not.toBeInTheDocument();
  });

  it("shows dash when last status is null", () => {
    render(<AttendanceTable members={[makeMember({ lastStatus: null })]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("formats late and absent statuses correctly", () => {
    render(<AttendanceTable members={[makeMember({ lastStatus: "late" }), makeMember({ id: 2, firstName: "Bob", lastName: "Jones", lastStatus: "absent" })]} />);
    expect(screen.getByText("Late")).toBeInTheDocument();
    expect(screen.getByText("Absent")).toBeInTheDocument();
  });

  it("shows zero rate when total is zero", () => {
    render(<AttendanceTable members={[makeMember({ attended: 0, total: 0 })]} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("reverses name sort when the member header is clicked", () => {
    const members = [
      makeMember({ id: 1, firstName: "Zara", lastName: "Jones" }),
      makeMember({ id: 2, firstName: "Alice", lastName: "Smith" }),
    ];
    render(<AttendanceTable members={members} />);

    fireEvent.click(screen.getByText("Member"));

    const zara = screen.getByText("Zara Jones");
    const alice = screen.getByText("Alice Smith");
    expect(zara.compareDocumentPosition(alice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sorts by attended count when the attended header is clicked", () => {
    const members = [
      makeMember({ id: 1, firstName: "Alice", lastName: "Smith", attended: 1, total: 4 }),
      makeMember({ id: 2, firstName: "Bob", lastName: "Jones", attended: 4, total: 4 }),
    ];
    render(<AttendanceTable members={members} />);

    fireEvent.click(screen.getByText("Attended"));

    const low = screen.getByText("1 / 4");
    const high = screen.getByText("4 / 4");
    expect(low.compareDocumentPosition(high) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sorts by rate when the rate header is clicked", () => {
    const members = [
      makeMember({ id: 1, firstName: "Alice", lastName: "Smith", attended: 1, total: 4 }),
      makeMember({ id: 2, firstName: "Bob", lastName: "Jones", attended: 4, total: 4 }),
    ];
    render(<AttendanceTable members={members} />);

    fireEvent.click(screen.getByText("Rate"));

    const low = screen.getByText("25%");
    const high = screen.getByText("100%");
    expect(low.compareDocumentPosition(high) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sorts by last status when the last status header is clicked", () => {
    const members = [
      makeMember({ id: 1, firstName: "Alice", lastName: "Smith", lastStatus: "absent" }),
      makeMember({ id: 2, firstName: "Bob", lastName: "Jones", lastStatus: "on_time" }),
    ];
    render(<AttendanceTable members={members} />);

    fireEvent.click(screen.getByText("Last status"));

    const onTime = screen.getByText("On time");
    const absent = screen.getByText("Absent");
    expect(onTime.compareDocumentPosition(absent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("reverses sort direction when the same header is clicked twice", () => {
    const members = [
      makeMember({ id: 1, firstName: "Alice", lastName: "Smith", attended: 1, total: 4 }),
      makeMember({ id: 2, firstName: "Bob", lastName: "Jones", attended: 4, total: 4 }),
    ];
    render(<AttendanceTable members={members} />);

    fireEvent.click(screen.getByText("Attended"));
    fireEvent.click(screen.getByText("Attended"));

    const low = screen.getByText("1 / 4");
    const high = screen.getByText("4 / 4");
    expect(high.compareDocumentPosition(low) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
