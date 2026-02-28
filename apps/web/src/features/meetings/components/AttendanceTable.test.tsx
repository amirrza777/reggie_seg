import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, type MockedFunction } from "vitest";

vi.mock("../api/client", () => ({
  markAttendance: vi.fn(),
}));

import { markAttendance } from "../api/client";
import { AttendanceTable } from "./AttendanceTable";

const markAttendanceMock = markAttendance as MockedFunction<typeof markAttendance>;

const attendances = [
  {
    id: 1,
    meetingId: 10,
    userId: 1,
    status: "absent",
    user: { id: 1, firstName: "Alice", lastName: "Smith" },
  },
  {
    id: 2,
    meetingId: 10,
    userId: 2,
    status: "on_time",
    user: { id: 2, firstName: "Bob", lastName: "Jones" },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  markAttendanceMock.mockResolvedValue(undefined as any);
});

describe("AttendanceTable", () => {
  it("renders attendee names and statuses", () => {
    render(<AttendanceTable meetingId={10} initialAttendances={attendances} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("renders a dropdown for each attendee", () => {
    render(<AttendanceTable meetingId={10} initialAttendances={attendances} />);
    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(2);
    expect(selects[0]).toHaveValue("absent");
    expect(selects[1]).toHaveValue("on_time");
  });

  it("updates status when dropdown changes", () => {
    render(<AttendanceTable meetingId={10} initialAttendances={attendances} />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "late" } });
    expect(selects[0]).toHaveValue("late");
  });

  it("saves attendance and shows success message", async () => {
    render(<AttendanceTable meetingId={10} initialAttendances={attendances} />);
    fireEvent.click(screen.getByRole("button", { name: /save attendance/i }));
    await waitFor(() => expect(markAttendanceMock).toHaveBeenCalledWith(10, [
      { userId: 1, status: "absent" },
      { userId: 2, status: "on_time" },
    ]));
    expect(screen.getByText(/attendance saved/i)).toBeInTheDocument();
  });

  it("saves updated status after dropdown change", async () => {
    render(<AttendanceTable meetingId={10} initialAttendances={attendances} />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "late" } });
    fireEvent.click(screen.getByRole("button", { name: /save attendance/i }));
    await waitFor(() => expect(markAttendanceMock).toHaveBeenCalledWith(10, [
      { userId: 1, status: "late" },
      { userId: 2, status: "on_time" },
    ]));
  });

  it("shows error message when save fails", async () => {
    markAttendanceMock.mockRejectedValue(new Error("Network error"));
    render(<AttendanceTable meetingId={10} initialAttendances={attendances} />);
    fireEvent.click(screen.getByRole("button", { name: /save attendance/i }));
    await waitFor(() => expect(screen.getByText(/network error/i)).toBeInTheDocument());
  });

  it("shows fallback error message for non-Error rejection", async () => {
    markAttendanceMock.mockRejectedValue("something went wrong");
    render(<AttendanceTable meetingId={10} initialAttendances={attendances} />);
    fireEvent.click(screen.getByRole("button", { name: /save attendance/i }));
    await waitFor(() => expect(screen.getByText(/failed to save/i)).toBeInTheDocument());
  });

  it("disables save button while saving", async () => {
    let resolve: () => void;
    markAttendanceMock.mockReturnValue(new Promise((r) => { resolve = r as () => void; }));
    render(<AttendanceTable meetingId={10} initialAttendances={attendances} />);
    fireEvent.click(screen.getByRole("button", { name: /save attendance/i }));
    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    resolve!();
    await waitFor(() => expect(screen.getByText(/attendance saved/i)).toBeInTheDocument());
  });
});
