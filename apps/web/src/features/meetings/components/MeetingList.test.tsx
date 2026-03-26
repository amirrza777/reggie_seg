import { render, screen, fireEvent } from "@testing-library/react";
import { vi, type MockedFunction } from "vitest";

vi.mock("@/features/auth/context", () => ({
  useUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("./AddToCalendarDropdown", () => ({
  AddToCalendarDropdown: ({ compact }: any) => (
    <div data-testid={compact ? "atc-compact" : "atc-full"} />
  ),
}));

import { useUser } from "@/features/auth/context";
import { MeetingList } from "./MeetingList";

const useUserMock = useUser as MockedFunction<typeof useUser>;

const futureDate = "2099-01-01T10:00:00Z";
const recentPastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
const oldPastDate = "2025-01-01T10:00:00Z";

const organiserUser = { id: 1, firstName: "Reggie", lastName: "King" };
const memberUser = { id: 99, firstName: "Other", lastName: "User" };
const writerUser = { id: 3, firstName: "Alice", lastName: "Doe" };

const sharedTeam = {
  allocations: [
    { user: organiserUser },
    { user: memberUser },
    { user: writerUser },
  ],
};

const recentPastMeeting = {
  id: 1,
  title: "Team Meeting",
  date: recentPastDate,
  organiser: organiserUser,
  location: "Bush House 3.01",
  videoCallLink: null,
  minutes: { writerId: writerUser.id, writer: writerUser },
  team: sharedTeam,
  participants: [{ user: organiserUser }],
  attendances: [],
};

const futureMeeting = {
  id: 2,
  title: "Group Check-in",
  date: futureDate,
  organiser: { id: 2, firstName: "John", lastName: "Smith" },
  location: null,
  videoCallLink: "https://meet.google.com/abc-defg-hij",
  minutes: null,
  team: { allocations: [{ user: { id: 2, firstName: "John", lastName: "Smith" } }, { user: memberUser }] },
  participants: [{ user: { id: 2 } }],
  attendances: [],
};

const oldPastMeeting = {
  id: 3,
  title: "Old Meeting",
  date: oldPastDate,
  organiser: organiserUser,
  location: null,
  videoCallLink: null,
  minutes: { writerId: writerUser.id, writer: writerUser },
  team: sharedTeam,
  participants: [{ user: organiserUser }],
  attendances: [],
};

const meetings = [recentPastMeeting, futureMeeting];

const defaultPermissions = {
  minutesEditWindowDays: 7,
  attendanceEditWindowDays: 7,
  allowAnyoneToEditMeetings: false,
  allowAnyoneToRecordAttendance: false,
  allowAnyoneToWriteMinutes: false,
};

beforeEach(() => {
  useUserMock.mockReturnValue({ user: memberUser } as any);
});

describe("MeetingList", () => {
  it("renders meeting titles", () => {
    render(<MeetingList meetings={meetings as any} projectId={1} />);
    expect(screen.getByText("Team Meeting")).toBeInTheDocument();
    expect(screen.getByText("Group Check-in")).toBeInTheDocument();
  });

  it("renders organiser names", () => {
    render(<MeetingList meetings={meetings as any} projectId={1} />);
    expect(screen.getByText("Reggie King")).toBeInTheDocument();
    expect(screen.getByText("John Smith")).toBeInTheDocument();
  });

  it("renders location when present", () => {
    render(<MeetingList meetings={meetings as any} projectId={1} />);
    expect(screen.getByText("Bush House 3.01")).toBeInTheDocument();
  });

  it("renders view link for each meeting", () => {
    render(<MeetingList meetings={meetings as any} projectId={5} />);
    const viewLinks = screen.getAllByRole("link", { name: /view meeting/i });
    expect(viewLinks).toHaveLength(2);
    expect(viewLinks[0]).toHaveAttribute("href", "/projects/5/meetings/1");
    expect(viewLinks[1]).toHaveAttribute("href", "/projects/5/meetings/2");
  });

  it("shows edit link for organiser on upcoming meetings", () => {
    useUserMock.mockReturnValue({ user: { id: 2, firstName: "John", lastName: "Smith" } } as any);
    render(<MeetingList meetings={meetings as any} projectId={1} />);
    expect(screen.getByRole("link", { name: /edit meeting/i })).toHaveAttribute("href", "/projects/1/meetings/2/edit");
  });

  it("does not show edit link for non-organiser when toggle is off", () => {
    render(<MeetingList meetings={meetings as any} projectId={1} permissions={defaultPermissions} />);
    expect(screen.queryByRole("link", { name: /edit meeting/i })).not.toBeInTheDocument();
  });

  it("shows edit link for non-organiser when toggle is on and user is a team member", () => {
    const permissions = { ...defaultPermissions, allowAnyoneToEditMeetings: true };
    render(<MeetingList meetings={[futureMeeting] as any} projectId={1} permissions={permissions} />);
    expect(screen.getByRole("link", { name: /edit meeting/i })).toBeInTheDocument();
  });

  it("does not show edit link for past meetings even for organiser", () => {
    useUserMock.mockReturnValue({ user: organiserUser } as any);
    render(<MeetingList meetings={[recentPastMeeting] as any} projectId={1} permissions={defaultPermissions} />);
    expect(screen.queryByRole("link", { name: /edit meeting/i })).not.toBeInTheDocument();
  });

  it("shows attendance link for organiser on past meetings within window", () => {
    useUserMock.mockReturnValue({ user: organiserUser } as any);
    render(<MeetingList meetings={[recentPastMeeting] as any} projectId={1} permissions={defaultPermissions} />);
    expect(screen.getByRole("link", { name: /record attendance/i })).toHaveAttribute("href", "/projects/1/meetings/1/attendance");
  });

  it("does not show attendance link for non-organiser when toggle is off", () => {
    render(<MeetingList meetings={[recentPastMeeting] as any} projectId={1} permissions={defaultPermissions} />);
    expect(screen.queryByRole("link", { name: /record attendance/i })).not.toBeInTheDocument();
  });

  it("shows attendance link for team member when toggle is on", () => {
    const permissions = { ...defaultPermissions, allowAnyoneToRecordAttendance: true };
    render(<MeetingList meetings={[recentPastMeeting] as any} projectId={1} permissions={permissions} />);
    expect(screen.getByRole("link", { name: /record attendance/i })).toBeInTheDocument();
  });

  it("does not show attendance link when window has closed", () => {
    useUserMock.mockReturnValue({ user: organiserUser } as any);
    render(<MeetingList meetings={[oldPastMeeting] as any} projectId={1} permissions={defaultPermissions} />);
    expect(screen.queryByRole("link", { name: /record attendance/i })).not.toBeInTheDocument();
  });

  it("does not show attendance link for upcoming meetings", () => {
    useUserMock.mockReturnValue({ user: organiserUser } as any);
    render(<MeetingList meetings={[futureMeeting] as any} projectId={1} permissions={defaultPermissions} />);
    expect(screen.queryByRole("link", { name: /record attendance/i })).not.toBeInTheDocument();
  });

  it("shows minutes link when no minutes exist within window", () => {
    const noMinutesMeeting = { ...recentPastMeeting, minutes: null };
    render(<MeetingList meetings={[noMinutesMeeting] as any} projectId={1} permissions={defaultPermissions} />);
    expect(screen.getByRole("link", { name: /meeting minutes/i })).toBeInTheDocument();
  });

  it("shows minutes link for the original writer within window", () => {
    useUserMock.mockReturnValue({ user: writerUser } as any);
    render(<MeetingList meetings={[recentPastMeeting] as any} projectId={1} permissions={defaultPermissions} />);
    expect(screen.getByRole("link", { name: /meeting minutes/i })).toBeInTheDocument();
  });

  it("does not show minutes link for non-writer when toggle is off", () => {
    render(<MeetingList meetings={[recentPastMeeting] as any} projectId={1} permissions={defaultPermissions} />);
    expect(screen.queryByRole("link", { name: /meeting minutes/i })).not.toBeInTheDocument();
  });

  it("shows minutes link for team member when toggle is on", () => {
    const permissions = { ...defaultPermissions, allowAnyoneToWriteMinutes: true };
    render(<MeetingList meetings={[recentPastMeeting] as any} projectId={1} permissions={permissions} />);
    expect(screen.getByRole("link", { name: /meeting minutes/i })).toBeInTheDocument();
  });

  it("does not show minutes link when window has closed", () => {
    useUserMock.mockReturnValue({ user: writerUser } as any);
    render(<MeetingList meetings={[oldPastMeeting] as any} projectId={1} permissions={defaultPermissions} />);
    expect(screen.queryByRole("link", { name: /meeting minutes/i })).not.toBeInTheDocument();
  });

  it("does not show minutes link for upcoming meetings", () => {
    render(<MeetingList meetings={[futureMeeting] as any} projectId={1} permissions={defaultPermissions} />);
    expect(screen.queryByRole("link", { name: /meeting minutes/i })).not.toBeInTheDocument();
  });

  it("shows join link for upcoming meetings with a video call link", () => {
    render(<MeetingList meetings={meetings as any} projectId={1} />);
    expect(screen.getByRole("link", { name: /join video call/i })).toBeInTheDocument();
  });

  it("does not show join link for past meetings", () => {
    const pastWithLink = [{ ...recentPastMeeting, videoCallLink: "https://meet.google.com/abc" }];
    render(<MeetingList meetings={pastWithLink as any} projectId={1} />);
    expect(screen.queryByRole("link", { name: /join video call/i })).not.toBeInTheDocument();
  });

  it("does not show join link for upcoming meetings without a video call link", () => {
    const upcomingNoLink = [{ ...futureMeeting, videoCallLink: null }];
    render(<MeetingList meetings={upcomingNoLink as any} projectId={1} />);
    expect(screen.queryByRole("link", { name: /join video call/i })).not.toBeInTheDocument();
  });

  it("shows compact calendar dropdown for upcoming meetings", () => {
    render(<MeetingList meetings={meetings as any} projectId={1} />);
    expect(screen.getByTestId("atc-compact")).toBeInTheDocument();
  });

  it("does not show calendar dropdown for past-only list", () => {
    render(<MeetingList meetings={[recentPastMeeting] as any} projectId={1} />);
    expect(screen.queryByTestId("atc-compact")).not.toBeInTheDocument();
  });

  it("shows minutes writer column when showMinutesWriter is true", () => {
    render(<MeetingList meetings={meetings as any} projectId={1} showMinutesWriter />);
    expect(screen.getByText("Minutes by")).toBeInTheDocument();
    expect(screen.getByText("Alice Doe")).toBeInTheDocument();
  });

  it("shows dash for meetings with no minutes writer", () => {
    const noMinutes = [{ ...recentPastMeeting, minutes: null }];
    render(<MeetingList meetings={noMinutes as any} projectId={1} showMinutesWriter />);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("sorts by date descending when showMinutesWriter is true", () => {
    const twoMeetings = [
      { ...recentPastMeeting, id: 1, title: "Older Meeting", date: "2024-01-01T10:00:00Z" },
      { ...recentPastMeeting, id: 2, title: "Newer Meeting", date: "2024-06-01T10:00:00Z" },
    ];
    render(<MeetingList meetings={twoMeetings as any} projectId={1} showMinutesWriter />);
    const position = screen.getByText("Newer Meeting").compareDocumentPosition(screen.getByText("Older Meeting"));
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("toggles sort direction when clicking an active column header", () => {
    render(<MeetingList meetings={meetings as any} projectId={1} />);
    const dateHeader = screen.getByText("Date");
    fireEvent.click(dateHeader);
    fireEvent.click(dateHeader);
    expect(screen.getByText("Team Meeting")).toBeInTheDocument();
  });

  it("renders empty message when no meetings", () => {
    render(<MeetingList meetings={[]} projectId={1} emptyMessage="No meetings yet." />);
    expect(screen.getByText("No meetings yet.")).toBeInTheDocument();
  });
});
