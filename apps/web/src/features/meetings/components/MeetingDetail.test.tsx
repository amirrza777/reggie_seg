import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MeetingDetail } from "./MeetingDetail";

vi.mock("@/features/auth/context", () => ({
  useUser: vi.fn(),
}));

vi.mock("./AttendanceTable", () => ({
  AttendanceTable: ({ meetingId }: any) => <div data-testid="attendance">{meetingId}</div>,
}));

vi.mock("./MeetingMinutes", () => ({
  MeetingMinutes: ({ meetingId }: any) => <div data-testid="minutes">{meetingId}</div>,
}));

vi.mock("./CommentSection", () => ({
  CommentSection: ({ meetingId }: any) => <div data-testid="comments">{meetingId}</div>,
}));

import { useUser } from "@/features/auth/context";

const useUserMock = vi.mocked(useUser);

const baseMeeting = {
  id: 1,
  teamId: 1,
  organiserId: 1,
  title: "Team Meeting",
  subject: null,
  location: null,
  agenda: null,
  date: "2026-03-01T10:00:00Z",
  createdAt: "2026-03-01T10:00:00Z",
  updatedAt: "2026-03-01T10:00:00Z",
  organiser: { id: 1, firstName: "Reggie", lastName: "King" },
  attendances: [],
  minutes: null,
  comments: [],
};

describe("MeetingDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserMock.mockReturnValue({ user: { id: 1, firstName: "Reggie", lastName: "King" } } as any);
  });

  it("renders meeting title and organiser", () => {
    render(<MeetingDetail meeting={baseMeeting} />);
    expect(screen.getByText("Team Meeting")).toBeInTheDocument();
    expect(screen.getByText(/Reggie King/)).toBeInTheDocument();
  });

  it("shows location when provided", () => {
    render(<MeetingDetail meeting={{ ...baseMeeting, location: "Bush House 3.01" }} />);
    expect(screen.getByText(/Bush House 3.01/)).toBeInTheDocument();
  });

  it("hides location when null", () => {
    render(<MeetingDetail meeting={baseMeeting} />);
    expect(screen.queryByText(/Location:/)).not.toBeInTheDocument();
  });

  it("shows agenda when provided", () => {
    render(<MeetingDetail meeting={{ ...baseMeeting, agenda: "Review tasks" }} />);
    expect(screen.getByText("Agenda")).toBeInTheDocument();
    expect(screen.getByText("Review tasks")).toBeInTheDocument();
  });

  it("hides agenda when null", () => {
    render(<MeetingDetail meeting={baseMeeting} />);
    expect(screen.queryByText("Agenda")).not.toBeInTheDocument();
  });

  it("renders child components", () => {
    render(<MeetingDetail meeting={baseMeeting} />);
    expect(screen.getByTestId("attendance")).toBeInTheDocument();
    expect(screen.getByTestId("minutes")).toBeInTheDocument();
    expect(screen.getByTestId("comments")).toBeInTheDocument();
  });

  it("passes existing minutes content to MeetingMinutes", () => {
    const meeting = {
      ...baseMeeting,
      minutes: { id: 1, meetingId: 1, writerId: 1, content: "some notes", createdAt: "", updatedAt: "" },
    };
    render(<MeetingDetail meeting={meeting} />);
    expect(screen.getByTestId("minutes")).toBeInTheDocument();
  });

  it("hides minutes when user is not logged in", () => {
    useUserMock.mockReturnValue({ user: null } as any);
    render(<MeetingDetail meeting={baseMeeting} />);
    expect(screen.queryByTestId("minutes")).not.toBeInTheDocument();
    expect(screen.getByTestId("attendance")).toBeInTheDocument();
    expect(screen.getByTestId("comments")).toBeInTheDocument();
  });
});
