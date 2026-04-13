import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getMeetingMock = vi.fn();
const getMeetingSettingsMock = vi.fn();

vi.mock("../../api/client", () => ({
  getMeeting: (...args: unknown[]) => getMeetingMock(...args),
  getMeetingSettings: (...args: unknown[]) => getMeetingSettingsMock(...args),
}));

vi.mock("@/features/auth/context", () => ({
  useUser: vi.fn(),
}));

vi.mock("./MeetingMinutes", () => ({
  MeetingMinutes: (props: any) => (
    <div data-testid="meeting-minutes">writerId={props.writerId}</div>
  ),
}));

vi.mock("@/shared/ui/rich-text/RichTextViewer", () => ({
  RichTextViewer: ({ content }: any) => (
    <div data-testid="rich-text-viewer">{content}</div>
  ),
}));

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ title, children }: any) => (
    <div data-testid="card"><h3>{title}</h3>{children}</div>
  ),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

const useProjectWorkspaceCanEditMock = vi.fn(() => ({ canEdit: true }));
vi.mock("@/features/projects/workspace/ProjectWorkspaceCanEditContext", () => ({
  useProjectWorkspaceCanEdit: (...args: unknown[]) => useProjectWorkspaceCanEditMock(...args),
}));

import { useUser } from "@/features/auth/context";
import { MeetingMinutesContent } from "./MeetingMinutesContent";

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
  minutes: null,
  team: {
    projectId: 1,
    teamName: "Reggie",
    allocations: [
      { user: { id: 5, firstName: "Reggie", lastName: "King" } },
      { user: { id: 2, firstName: "Alex", lastName: "Trebek" } },
    ],
  },
};

const baseSettings = {
  minutesEditWindowDays: 7,
  allowAnyoneToWriteMinutes: false,
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

describe("MeetingMinutesContent", () => {
  it("renders nothing while loading", () => {
    getMeetingMock.mockReturnValue(new Promise(() => {}));
    getMeetingSettingsMock.mockReturnValue(new Promise(() => {}));

    const { container } = render(<MeetingMinutesContent meetingId={1} projectId={1} />);

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when user is null", async () => {
    useUserMock.mockReturnValue({ user: null });

    const { container } = render(<MeetingMinutesContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(getMeetingMock).toHaveBeenCalled();
    });

    expect(container.innerHTML).toBe("");
  });

  it("shows message when meeting is in the future", async () => {
    getMeetingMock.mockResolvedValue({ ...baseMeeting, date: futureDate });

    render(<MeetingMinutesContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Minutes cannot be written until the meeting has started.")).toBeInTheDocument();
    });
  });

  it("shows closed window message with viewer when edit window expired", async () => {
    getMeetingMock.mockResolvedValue({
      ...baseMeeting,
      date: expiredDate,
      minutes: { writerId: 5, content: "Previous minutes content" },
    });

    render(<MeetingMinutesContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("The edit window for these minutes has closed.")).toBeInTheDocument();
    });

    expect(screen.getByTestId("rich-text-viewer")).toBeInTheDocument();
    expect(screen.getByText("Previous minutes content")).toBeInTheDocument();
  });

  it("shows closed window message without viewer when no minutes exist", async () => {
    getMeetingMock.mockResolvedValue({ ...baseMeeting, date: expiredDate });

    render(<MeetingMinutesContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("The edit window for these minutes has closed.")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("rich-text-viewer")).not.toBeInTheDocument();
  });

  it("shows permission message when user is not the original writer", async () => {
    getMeetingMock.mockResolvedValue({
      ...baseMeeting,
      minutes: { writerId: 99, content: "Someone else wrote this" },
    });

    render(<MeetingMinutesContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Only the original writer can edit these minutes.")).toBeInTheDocument();
    });

    expect(screen.getByTestId("rich-text-viewer")).toBeInTheDocument();
  });

  it("renders minutes editor when no minutes exist yet", async () => {
    render(<MeetingMinutesContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByTestId("meeting-minutes")).toBeInTheDocument();
    });

    expect(screen.getByText("writerId=5")).toBeInTheDocument();
  });

  it("renders minutes editor when user is the original writer", async () => {
    getMeetingMock.mockResolvedValue({
      ...baseMeeting,
      minutes: { writerId: 5, content: "My minutes" },
    });

    render(<MeetingMinutesContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByTestId("meeting-minutes")).toBeInTheDocument();
    });
  });

  it("renders minutes editor when anyone can write and user is a member", async () => {
    useUserMock.mockReturnValue({ user: { id: 2 } });
    getMeetingSettingsMock.mockResolvedValue({ ...baseSettings, allowAnyoneToWriteMinutes: true });
    getMeetingMock.mockResolvedValue({
      ...baseMeeting,
      minutes: { writerId: 99, content: "Other writer" },
    });

    render(<MeetingMinutesContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByTestId("meeting-minutes")).toBeInTheDocument();
    });
  });

  it("shows archived message with viewer when workspace is read-only and minutes exist", async () => {
    useProjectWorkspaceCanEditMock.mockReturnValue({ canEdit: false });
    getMeetingMock.mockResolvedValue({
      ...baseMeeting,
      minutes: { writerId: 5, content: "Archived minutes" },
    });

    render(<MeetingMinutesContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("This project is archived; minutes are read-only.")).toBeInTheDocument();
    });
    expect(screen.getByTestId("rich-text-viewer")).toBeInTheDocument();

    useProjectWorkspaceCanEditMock.mockReturnValue({ canEdit: true });
  });

  it("shows archived message without viewer when workspace is read-only and no minutes", async () => {
    useProjectWorkspaceCanEditMock.mockReturnValue({ canEdit: false });

    render(<MeetingMinutesContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("This project is archived; minutes are read-only.")).toBeInTheDocument();
    });
    expect(screen.getByText("No minutes recorded.")).toBeInTheDocument();

    useProjectWorkspaceCanEditMock.mockReturnValue({ canEdit: true });
  });

  it("shows meeting breadcrumbs", async () => {
    render(<MeetingMinutesContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      const currentCrumb = screen.getAllByText("Minutes").find((node) => node.getAttribute("aria-current") === "page");
      expect(currentCrumb).toBeDefined();
    });
    expect(screen.getByRole("link", { name: "Meeting" })).toHaveAttribute("href", "/projects/1/meetings/1");
  });
});
