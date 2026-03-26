import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MeetingsPageContent } from "./MeetingsPageContent";

vi.mock("../api/client", () => ({
  listMeetings: vi.fn(),
  getTeamMeetingSettings: vi.fn().mockResolvedValue({ minutesEditWindowDays: 7, attendanceEditWindowDays: 7, allowAnyoneToEditMeetings: false, allowAnyoneToRecordAttendance: false, allowAnyoneToWriteMinutes: false }),
}));

vi.mock("@/features/auth/context", () => ({
  useUser: vi.fn(() => ({ user: { id: 99, firstName: "Test", lastName: "User" } })),
}));

vi.mock("./CreateMeetingForm", () => ({
  CreateMeetingForm: ({ onCreated, onCancel }: any) => (
    <div data-testid="create-form">
      <button type="button" onClick={onCreated}>submit</button>
      <button type="button" onClick={onCancel}>cancel</button>
    </div>
  ),
}));

vi.mock("./AddToCalendarDropdown", () => ({
  AddToCalendarDropdown: () => <div data-testid="atc" />,
}));

import { listMeetings } from "../api/client";

const listMeetingsMock = vi.mocked(listMeetings);

const futureMeeting = {
  id: 1,
  title: "Team Meeting",
  date: "2099-01-01T10:00:00Z",
  organiser: { id: 1, firstName: "Reggie", lastName: "King" },
  location: "Bush House 3.01",
  minutes: null,
  videoCallLink: null,
  team: { allocations: [] },
  participants: [],
  attendances: [],
};

const pastMeeting = {
  id: 2,
  title: "Group Check-in",
  date: "2020-01-01T10:00:00Z",
  organiser: { id: 2, firstName: "John", lastName: "Smith" },
  location: null,
  minutes: null,
  videoCallLink: null,
  team: { allocations: [] },
  participants: [],
  attendances: [],
};

describe("MeetingsPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMeetingsMock.mockResolvedValue([futureMeeting, pastMeeting] as any);
  });

  it("fetches meetings and shows upcoming by default", async () => {
    render(<MeetingsPageContent teamId={10} projectId={1} />);
    await waitFor(() => {
      expect(screen.getByText("Team Meeting")).toBeInTheDocument();
    });
    expect(screen.queryByText("Group Check-in")).not.toBeInTheDocument();
    expect(listMeetingsMock).toHaveBeenCalledWith(10);
  });

  it("switches to previous meetings tab", async () => {
    render(<MeetingsPageContent teamId={10} projectId={1} />);
    await waitFor(() => screen.getByText("Team Meeting"));
    fireEvent.click(screen.getByText("Previous meetings"));
    expect(screen.getByText("Group Check-in")).toBeInTheDocument();
    expect(screen.queryByText("Team Meeting")).not.toBeInTheDocument();
  });

  it("switches back to upcoming tab", async () => {
    render(<MeetingsPageContent teamId={10} projectId={1} />);
    await waitFor(() => screen.getByText("Team Meeting"));
    fireEvent.click(screen.getByText("Previous meetings"));
    fireEvent.click(screen.getByText("Upcoming meetings"));
    expect(screen.getByText("Team Meeting")).toBeInTheDocument();
    expect(screen.queryByText("Group Check-in")).not.toBeInTheDocument();
  });

  it("shows empty message when no upcoming meetings", async () => {
    listMeetingsMock.mockResolvedValue([pastMeeting] as any);
    render(<MeetingsPageContent teamId={10} projectId={1} />);
    await waitFor(() => {
      expect(screen.getByText("There are no scheduled meetings to list at this time.")).toBeInTheDocument();
    });
  });

  it("shows empty message when no previous meetings", async () => {
    listMeetingsMock.mockResolvedValue([futureMeeting] as any);
    render(<MeetingsPageContent teamId={10} projectId={1} />);
    await waitFor(() => screen.getByText("Team Meeting"));
    fireEvent.click(screen.getByText("Previous meetings"));
    expect(screen.getByText("No previous meetings.")).toBeInTheDocument();
  });

  it("shows create form when new meeting button is clicked", async () => {
    render(<MeetingsPageContent teamId={10} projectId={1} />);
    await waitFor(() => screen.getByText("Team Meeting"));
    fireEvent.click(screen.getByRole("button", { name: /new meeting/i }));
    expect(screen.getByTestId("create-form")).toBeInTheDocument();
  });

  it("hides create form on form cancel", async () => {
    render(<MeetingsPageContent teamId={10} projectId={1} />);
    await waitFor(() => screen.getByText("Team Meeting"));
    fireEvent.click(screen.getByRole("button", { name: /new meeting/i }));
    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(screen.queryByTestId("create-form")).not.toBeInTheDocument();
  });

  it("hides create form when toolbar cancel is clicked", async () => {
    render(<MeetingsPageContent teamId={10} projectId={1} />);
    await waitFor(() => screen.getByText("Team Meeting"));
    fireEvent.click(screen.getByRole("button", { name: /new meeting/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /cancel/i })[0]);
    expect(screen.queryByTestId("create-form")).not.toBeInTheDocument();
  });

  it("refreshes list and hides form after creating", async () => {
    render(<MeetingsPageContent teamId={10} projectId={1} />);
    await waitFor(() => screen.getByText("Team Meeting"));
    fireEvent.click(screen.getByRole("button", { name: /new meeting/i }));
    fireEvent.click(screen.getByRole("button", { name: "submit" }));
    await waitFor(() => {
      expect(listMeetingsMock).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByTestId("create-form")).not.toBeInTheDocument();
  });

  it("new meeting button is visible on previous tab", async () => {
    render(<MeetingsPageContent teamId={10} projectId={1} />);
    await waitFor(() => screen.getByText("Team Meeting"));
    fireEvent.click(screen.getByText("Previous meetings"));
    expect(screen.getByRole("button", { name: /new meeting/i })).toBeInTheDocument();
  });

  it("renders location for upcoming meetings", async () => {
    render(<MeetingsPageContent teamId={10} projectId={1} />);
    await waitFor(() => screen.getByText("Team Meeting"));
    expect(screen.getByText("Bush House 3.01")).toBeInTheDocument();
  });
});
