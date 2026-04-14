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

vi.mock("./forms/MeetingEditForm", () => ({
  MeetingEditForm: (props: any) => (
    <div data-testid="edit-form">{props.meeting.title}</div>
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
import { MeetingEditContent } from "./MeetingEditContent";

const useUserMock = useUser as ReturnType<typeof vi.fn>;

const baseMeeting = {
  id: 1,
  teamId: 10,
  organiserId: 5,
  title: "Reggie Team Meeting",
  date: "2026-03-26T14:00:00Z",
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
  allowAnyoneToEditMeetings: false,
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

describe("MeetingEditContent", () => {
  it("renders nothing while loading", () => {
    getMeetingMock.mockReturnValue(new Promise(() => {}));
    getMeetingSettingsMock.mockReturnValue(new Promise(() => {}));

    const { container } = render(<MeetingEditContent meetingId={1} projectId={1} />);

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when user is null", async () => {
    useUserMock.mockReturnValue({ user: null });

    const { container } = render(<MeetingEditContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(getMeetingMock).toHaveBeenCalled();
    });

    expect(container.innerHTML).toBe("");
  });

  it("renders edit form when user is organiser", async () => {
    render(<MeetingEditContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-form")).toBeInTheDocument();
    });

    expect(screen.getByText("Reggie Team Meeting")).toBeInTheDocument();
  });

  it("renders edit form when anyone can edit and user is a member", async () => {
    useUserMock.mockReturnValue({ user: { id: 2 } });
    getMeetingSettingsMock.mockResolvedValue({ allowAnyoneToEditMeetings: true });

    render(<MeetingEditContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-form")).toBeInTheDocument();
    });
  });

  it("shows permission message when user cannot edit", async () => {
    useUserMock.mockReturnValue({ user: { id: 99 } });

    render(<MeetingEditContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("You don't have permission to edit this meeting.")).toBeInTheDocument();
    });
  });

  it("shows past meeting message when meeting has started", async () => {
    getMeetingMock.mockResolvedValue({
      ...baseMeeting,
      date: "2026-03-24T10:00:00Z",
    });

    render(<MeetingEditContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Meeting details cannot be edited once the meeting has started.")).toBeInTheDocument();
    });
  });

  it("shows archived message when workspace is read-only", async () => {
    useProjectWorkspaceCanEditMock.mockReturnValue({ canEdit: false });

    render(<MeetingEditContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("This project is archived; meetings cannot be edited.")).toBeInTheDocument();
    });

    useProjectWorkspaceCanEditMock.mockReturnValue({ canEdit: true });
  });

  it("shows meeting breadcrumbs", async () => {
    render(<MeetingEditContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Edit meeting")).toHaveAttribute("aria-current", "page");
    });
    expect(screen.getByRole("link", { name: "Meeting" })).toHaveAttribute("href", "/projects/1/meetings/1");
  });
});
