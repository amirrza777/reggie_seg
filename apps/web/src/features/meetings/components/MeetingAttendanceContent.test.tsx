import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getMeetingMock = vi.fn();
const getMeetingSettingsMock = vi.fn();

vi.mock("../api/client", () => ({
  getMeeting: (...args: unknown[]) => getMeetingMock(...args),
  getMeetingSettings: (...args: unknown[]) => getMeetingSettingsMock(...args),
}));

vi.mock("@/features/auth/context", () => ({
  useUser: vi.fn(),
}));

vi.mock("./AttendanceTable", () => ({
  AttendanceTable: (props: any) => (
    <div data-testid="attendance-table">
      members={props.members.length}
    </div>
  ),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

import { useUser } from "@/features/auth/context";
import { MeetingAttendanceContent } from "./MeetingAttendanceContent";

const useUserMock = useUser as ReturnType<typeof vi.fn>;

const pastDate = "2026-03-24T14:00:00Z";
const futureDate = "2026-03-26T14:00:00Z";
const expiredDate = "2026-03-01T14:00:00Z";

const baseMeeting = {
  id: 1,
  teamId: 10,
  organiserId: 5,
  title: "Reggie Team Meeting",
  date: pastDate,
  participants: [
    { user: { id: 5, firstName: "Reggie", lastName: "King" } },
    { user: { id: 2, firstName: "Alex", lastName: "Trebek" } },
  ],
  attendances: [],
  team: {
    projectId: 1,
    teamName: "Reggie",
    allocations: [
      { user: { id: 5, firstName: "Reggie", lastName: "King" } },
      { user: { id: 2, firstName: "Alex", lastName: "Trebek" } },
      { user: { id: 3, firstName: "Bob", lastName: "Jones" } },
    ],
  },
};

const baseSettings = {
  allowAnyoneToRecordAttendance: false,
  attendanceEditWindowDays: 7,
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-03-25T12:00:00Z"));
  getMeetingMock.mockReset();
  getMeetingSettingsMock.mockReset();
  useUserMock.mockReturnValue({ user: { id: 5 } });
  getMeetingMock.mockResolvedValue(baseMeeting);
  getMeetingSettingsMock.mockResolvedValue(baseSettings);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("MeetingAttendanceContent", () => {
  it("renders nothing while loading", () => {
    getMeetingMock.mockReturnValue(new Promise(() => {}));
    getMeetingSettingsMock.mockReturnValue(new Promise(() => {}));

    const { container } = render(<MeetingAttendanceContent meetingId={1} projectId={1} />);

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when user is null", async () => {
    useUserMock.mockReturnValue({ user: null });

    const { container } = render(<MeetingAttendanceContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(getMeetingMock).toHaveBeenCalled();
    });

    expect(container.innerHTML).toBe("");
  });

  it("shows message when meeting is in the future", async () => {
    getMeetingMock.mockResolvedValue({ ...baseMeeting, date: futureDate });

    render(<MeetingAttendanceContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Attendance can only be recorded during or after the meeting.")).toBeInTheDocument();
    });
  });

  it("shows message when edit window has closed", async () => {
    getMeetingMock.mockResolvedValue({ ...baseMeeting, date: expiredDate });

    render(<MeetingAttendanceContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("The attendance recording window for this meeting has closed.")).toBeInTheDocument();
    });
  });

  it("shows permission message when user cannot record", async () => {
    useUserMock.mockReturnValue({ user: { id: 99 } });

    render(<MeetingAttendanceContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("You don't have permission to record attendance for this meeting.")).toBeInTheDocument();
    });
  });

  it("renders attendance table when organiser can record", async () => {
    render(<MeetingAttendanceContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByTestId("attendance-table")).toBeInTheDocument();
    });
  });

  it("renders attendance table when anyone can record and user is a member", async () => {
    useUserMock.mockReturnValue({ user: { id: 2 } });
    getMeetingSettingsMock.mockResolvedValue({ ...baseSettings, allowAnyoneToRecordAttendance: true });

    render(<MeetingAttendanceContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByTestId("attendance-table")).toBeInTheDocument();
    });
  });

  it("uses participants as members when participants exist", async () => {
    render(<MeetingAttendanceContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("members=2")).toBeInTheDocument();
    });
  });

  it("falls back to allocations when no participants", async () => {
    getMeetingMock.mockResolvedValue({ ...baseMeeting, participants: [] });

    render(<MeetingAttendanceContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("members=3")).toBeInTheDocument();
    });
  });

  it("shows meeting breadcrumbs", async () => {
    render(<MeetingAttendanceContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Attendance")).toHaveAttribute("aria-current", "page");
    });
    expect(screen.getByRole("link", { name: "Meeting" })).toHaveAttribute("href", "/projects/1/meetings/1");
  });
});
