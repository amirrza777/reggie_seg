import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type MockedFunction } from "vitest";
import { MeetingDetail } from "./MeetingDetail";
import { useUser } from "@/features/auth/useUser";
import type { Meeting } from "../types";

vi.mock("@/features/auth/useUser", () => ({
  useUser: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

type MockChildProps = { meetingId: number };

vi.mock("./CommentSection", () => ({
  CommentSection: ({ meetingId }: MockChildProps) => <div data-testid="comments">{meetingId}</div>,
}));

vi.mock("./AddToCalendarDropdown", () => ({
  AddToCalendarDropdown: () => <div data-testid="add-to-calendar" />,
}));

vi.mock("@/shared/ui/RichTextViewer", () => ({
  RichTextViewer: () => <div data-testid="rich-text-viewer" />,
}));

const useUserMock = useUser as MockedFunction<typeof useUser>;

const recentPastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
const futureDate = "2099-01-01T10:00:00Z";
const pastDate = "2020-01-01T10:00:00Z";

type UseUserValue = ReturnType<typeof useUser>;

function makeUseUserValue(user: UseUserValue["user"]): UseUserValue {
  return {
    user,
    loading: false,
    setUser: vi.fn(),
    refresh: vi.fn().mockResolvedValue(user),
  };
}

const baseMeeting: Meeting = {
  id: 1,
  teamId: 1,
  organiserId: 1,
  title: "Team Meeting",
  subject: null,
  location: null,
  videoCallLink: null,
  agenda: null,
  date: "2026-03-01T10:00:00Z",
  createdAt: "2026-03-01T10:00:00Z",
  updatedAt: "2026-03-01T10:00:00Z",
  organiser: { id: 1, firstName: "Reggie", lastName: "King" },
  team: { enterpriseId: "DEFAULT", allocations: [{ user: { id: 1, firstName: "Reggie", lastName: "King" } }] },
  participants: [],
  attendances: [],
  minutes: null,
  comments: [],
};

const defaultPermissions = {
  minutesEditWindowDays: 7,
  attendanceEditWindowDays: 7,
  allowAnyoneToEditMeetings: false,
  allowAnyoneToRecordAttendance: false,
  allowAnyoneToWriteMinutes: false,
};

const organiserUser = { id: 1, firstName: "Reggie", lastName: "King" };
const otherUser = { id: 99, firstName: "Other", lastName: "User" };

describe("MeetingDetail", () => {
  beforeEach(() => {
    useUserMock.mockReturnValue(makeUseUserValue(otherUser as UseUserValue["user"]));
  });

  it("renders meeting title and organiser", () => {
    render(<MeetingDetail meeting={baseMeeting as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.getByRole("heading", { name: "Team Meeting" })).toBeInTheDocument();
    expect(screen.getByText(/Reggie King/)).toBeInTheDocument();
  });

  it("renders meetings breadcrumb link", () => {
    render(<MeetingDetail meeting={baseMeeting as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.getByRole("link", { name: "Meetings" })).toHaveAttribute("href", "/projects/5/meetings?tab=previous");
  });

  it("renders current breadcrumb with meeting title", () => {
    const upcoming = { ...baseMeeting, date: futureDate };
    render(<MeetingDetail meeting={upcoming as any} projectId={5} permissions={defaultPermissions} />);
    const currentCrumb = screen.getAllByText("Team Meeting").find((node) => node.getAttribute("aria-current") === "page");
    expect(currentCrumb).toBeDefined();
  });

  it("shows location when provided", () => {
    render(<MeetingDetail meeting={{ ...baseMeeting, location: "Bush House 3.01" } as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.getByText(/Bush House 3.01/)).toBeInTheDocument();
  });

  it("hides location when null", () => {
    render(<MeetingDetail meeting={baseMeeting as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.queryByText(/Location:/)).not.toBeInTheDocument();
  });

  it("shows subject when provided", () => {
    render(<MeetingDetail meeting={{ ...baseMeeting, subject: "Sprint review" } as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.getByText(/Sprint review/)).toBeInTheDocument();
  });

  it("hides subject when null", () => {
    render(<MeetingDetail meeting={baseMeeting as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.queryByText(/Subject:/)).not.toBeInTheDocument();
  });

  it("shows video call link when provided", () => {
    render(<MeetingDetail meeting={{ ...baseMeeting, videoCallLink: "https://meet.google.com/abc" } as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.getByRole("link", { name: /https:\/\/meet.google.com\/abc/ })).toBeInTheDocument();
  });

  it("hides video call link when null", () => {
    render(<MeetingDetail meeting={baseMeeting as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.queryByText(/Video call:/)).not.toBeInTheDocument();
  });

  it("shows agenda when provided", () => {
    render(<MeetingDetail meeting={{ ...baseMeeting, agenda: "Review tasks" } as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.getByText("Agenda")).toBeInTheDocument();
    expect(screen.getByTestId("rich-text-viewer")).toBeInTheDocument();
  });

  it("hides agenda when null", () => {
    render(<MeetingDetail meeting={baseMeeting as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.queryByText("Agenda")).not.toBeInTheDocument();
  });

  it("renders comments section", () => {
    render(<MeetingDetail meeting={baseMeeting as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.getByTestId("comments")).toBeInTheDocument();
  });

  it("hides attendance section when no attendances", () => {
    render(<MeetingDetail meeting={baseMeeting as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.queryByText("Attendance")).not.toBeInTheDocument();
  });

  it("shows attendance section when attendances exist", () => {
    const withAttendances: Meeting = {
      ...baseMeeting,
      date: pastDate,
      attendances: [
        { id: 1, meetingId: 1, userId: 1, status: "on_time", user: { id: 1, firstName: "Reggie", lastName: "King" } },
        { id: 2, meetingId: 1, userId: 2, status: "absent", user: { id: 2, firstName: "John", lastName: "Smith" } },
      ],
    };
    render(<MeetingDetail meeting={withAttendances as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.getByText("Attendance")).toBeInTheDocument();
    expect(screen.getByText("On time")).toBeInTheDocument();
    expect(screen.getByText("Absent")).toBeInTheDocument();
  });

  it("shows minutes when present", () => {
    const withMinutes: Meeting = {
      ...baseMeeting,
      date: pastDate,
      minutes: {
        id: 1,
        meetingId: 1,
        writerId: 1,
        writer: { id: 1, firstName: "Reggie", lastName: "King" },
        content: "{}",
        createdAt: "",
        updatedAt: "",
      },
    };
    render(<MeetingDetail meeting={withMinutes as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.getByText("Minutes")).toBeInTheDocument();
    expect(screen.getByTestId("rich-text-viewer")).toBeInTheDocument();
  });

  it("hides minutes section when null", () => {
    render(<MeetingDetail meeting={baseMeeting as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.queryByText("Minutes")).not.toBeInTheDocument();
  });

  it("shows add to calendar for upcoming meetings", () => {
    const upcoming = { ...baseMeeting, date: futureDate };
    render(<MeetingDetail meeting={upcoming as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.getByTestId("add-to-calendar")).toBeInTheDocument();
  });

  it("hides add to calendar for past meetings", () => {
    const past = { ...baseMeeting, date: pastDate };
    render(<MeetingDetail meeting={past as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.queryByTestId("add-to-calendar")).not.toBeInTheDocument();
  });

  it("shows edit link for organiser on upcoming meetings", () => {
    useUserMock.mockReturnValue(makeUseUserValue(organiserUser as UseUserValue["user"]));
    const upcoming = { ...baseMeeting, date: futureDate };
    render(<MeetingDetail meeting={upcoming as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.getByRole("link", { name: /edit meeting/i })).toHaveAttribute("href", "/projects/5/meetings/1/edit");
  });

  it("does not show edit link for non-organiser", () => {
    const upcoming = { ...baseMeeting, date: futureDate };
    render(<MeetingDetail meeting={upcoming as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.queryByRole("link", { name: /edit meeting/i })).not.toBeInTheDocument();
  });

  it("shows attendance link for organiser on recent past meetings", () => {
    useUserMock.mockReturnValue({ user: organiserUser } as any);
    const recentPast = { ...baseMeeting, date: recentPastDate };
    render(<MeetingDetail meeting={recentPast as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.getByRole("link", { name: /record attendance/i })).toHaveAttribute("href", "/projects/5/meetings/1/attendance");
  });

  it("shows minutes link for all users on recent past meetings with no existing minutes", () => {
    const recentPast = { ...baseMeeting, date: recentPastDate };
    render(<MeetingDetail meeting={recentPast as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.getByRole("link", { name: /meeting minutes/i })).toHaveAttribute("href", "/projects/5/meetings/1/minutes");
  });

  it("does not show attendance or minutes links for upcoming meetings", () => {
    const upcoming = { ...baseMeeting, date: futureDate };
    render(<MeetingDetail meeting={upcoming as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.queryByRole("link", { name: /record attendance/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /meeting minutes/i })).not.toBeInTheDocument();
  });

  it("shows participants table when participants exist and no attendances recorded", () => {
    const withParticipants: Meeting = {
      ...baseMeeting,
      participants: [
        { user: { id: 1, firstName: "Reggie", lastName: "King" } },
        { user: { id: 2, firstName: "John", lastName: "Smith" } },
      ],
      attendances: [],
    };
    render(<MeetingDetail meeting={withParticipants as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.getByText("Participants")).toBeInTheDocument();
    expect(screen.getByText("Reggie King")).toBeInTheDocument();
    expect(screen.getByText("John Smith")).toBeInTheDocument();
  });

  it("hides participants table when attendances are recorded", () => {
    const withBoth: Meeting = {
      ...baseMeeting,
      participants: [
        { user: { id: 1, firstName: "Reggie", lastName: "King" } },
      ],
      attendances: [
        { id: 1, meetingId: 1, userId: 1, status: "on_time", user: { id: 1, firstName: "Reggie", lastName: "King" } },
      ],
    };
    render(<MeetingDetail meeting={withBoth as any} projectId={5} permissions={defaultPermissions} />);
    expect(screen.queryByText("Participants")).not.toBeInTheDocument();
    expect(screen.getByText("Attendance")).toBeInTheDocument();
  });
});
