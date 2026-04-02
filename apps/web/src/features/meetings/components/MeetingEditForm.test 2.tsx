import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, type MockedFunction } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../api/client", () => ({
  updateMeeting: vi.fn(),
  deleteMeeting: vi.fn(),
}));

vi.mock("@/shared/ui/RichTextEditor", () => ({
  RichTextEditor: ({ onChange }: { onChange: (v: string) => void }) => (
    <textarea data-testid="agenda-editor" onChange={(e) => onChange(e.target.value)} />
  ),
}));

import { updateMeeting, deleteMeeting } from "../api/client";
import { MeetingEditForm } from "./MeetingEditForm";

const updateMeetingMock = updateMeeting as MockedFunction<typeof updateMeeting>;
const deleteMeetingMock = deleteMeeting as MockedFunction<typeof deleteMeeting>;

const baseMeeting = {
  id: 1,
  teamId: 10,
  organiserId: 5,
  title: "Reggie Team Meeting",
  date: "2026-03-18T14:00:00Z",
  subject: "Progress check",
  location: "Bush House 4.02",
  videoCallLink: "https://meet.example.com/abc",
  agenda: "Review tasks",
  participants: [{ userId: 1 }, { userId: 2 }],
  attendance: [],
  comments: [],
  minutes: null,
  team: {
    projectId: 1,
    teamName: "Reggie",
    allocations: [
      { user: { id: 1, firstName: "Reggie", lastName: "King" } },
      { user: { id: 2, firstName: "Alex", lastName: "Smith" } },
      { user: { id: 3, firstName: "Bob", lastName: "Jones" } },
    ],
  },
} as any;

beforeEach(() => {
  pushMock.mockReset();
  updateMeetingMock.mockReset();
  deleteMeetingMock.mockReset();
  updateMeetingMock.mockResolvedValue({} as any);
  deleteMeetingMock.mockResolvedValue(undefined as any);
});

describe("MeetingEditForm", () => {
  it("renders form fields with meeting values", () => {
    render(<MeetingEditForm meeting={baseMeeting} userId={5} projectId={1} />);

    expect(screen.getByDisplayValue("Reggie Team Meeting")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Progress check")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Bush House 4.02")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://meet.example.com/abc")).toBeInTheDocument();
  });

  it("disables save when title is empty", () => {
    render(<MeetingEditForm meeting={baseMeeting} userId={5} projectId={1} />);

    fireEvent.change(screen.getByDisplayValue("Reggie Team Meeting"), { target: { value: "" } });

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("submits form with updated values", async () => {
    render(<MeetingEditForm meeting={baseMeeting} userId={5} projectId={1} />);

    fireEvent.change(screen.getByDisplayValue("Reggie Team Meeting"), { target: { value: "Updated Title" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save changes" }).closest("form")!);

    await waitFor(() => {
      expect(updateMeetingMock).toHaveBeenCalledWith(1, 5, expect.objectContaining({
        title: "Updated Title",
      }));
    });

    expect(pushMock).toHaveBeenCalledWith("/projects/1/meetings/1");
  });

  it("renders with null optional fields", () => {
    const meeting = {
      ...baseMeeting,
      subject: null,
      location: null,
      videoCallLink: null,
      agenda: null,
    };

    render(<MeetingEditForm meeting={meeting} userId={5} projectId={1} />);

    expect(screen.getByDisplayValue("Reggie Team Meeting")).toBeInTheDocument();
    expect(screen.getByLabelText("Subject")).toHaveValue("");
    expect(screen.getByLabelText("Location")).toHaveValue("");
    expect(screen.getByLabelText("Video call link")).toHaveValue("");
  });

  it("submits with invite all sending all member ids", async () => {
    const meeting = {
      ...baseMeeting,
      participants: [{ userId: 1 }, { userId: 2 }, { userId: 3 }],
    };

    render(<MeetingEditForm meeting={meeting} userId={5} projectId={1} />);
    fireEvent.change(screen.getByDisplayValue("Progress check"), { target: { value: "" } });
    fireEvent.change(screen.getByDisplayValue("Bush House 4.02"), { target: { value: "" } });
    fireEvent.change(screen.getByDisplayValue("https://meet.example.com/abc"), { target: { value: "" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save changes" }).closest("form")!);

    await waitFor(() => {
      expect(updateMeetingMock).toHaveBeenCalledWith(1, 5, expect.objectContaining({
        subject: undefined,
        location: undefined,
        videoCallLink: undefined,
        participantIds: [1, 2, 3],
      }));
    });
  });

  it("shows saving state while submitting", async () => {
    let resolveUpdate: (v: any) => void;
    updateMeetingMock.mockImplementation(
      () => new Promise((resolve) => { resolveUpdate = resolve; }),
    );

    render(<MeetingEditForm meeting={baseMeeting} userId={5} projectId={1} />);
    fireEvent.submit(screen.getByRole("button", { name: "Save changes" }).closest("form")!);

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();

    await waitFor(() => {
      resolveUpdate!({});
    });
  });

  it("shows error message when update fails", async () => {
    updateMeetingMock.mockRejectedValue(new Error("Server error"));

    render(<MeetingEditForm meeting={baseMeeting} userId={5} projectId={1} />);
    fireEvent.submit(screen.getByRole("button", { name: "Save changes" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("shows fallback error for non-Error throws", async () => {
    updateMeetingMock.mockRejectedValue("unknown");

    render(<MeetingEditForm meeting={baseMeeting} userId={5} projectId={1} />);
    fireEvent.submit(screen.getByRole("button", { name: "Save changes" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Failed to save changes")).toBeInTheDocument();
    });
  });

  it("navigates back when cancel is clicked", () => {
    render(<MeetingEditForm meeting={baseMeeting} userId={5} projectId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(pushMock).toHaveBeenCalledWith("/projects/1/meetings/1");
  });

  it("shows delete confirmation on delete click", () => {
    render(<MeetingEditForm meeting={baseMeeting} userId={5} projectId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete meeting" }));

    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();
  });

  it("cancels delete confirmation", () => {
    render(<MeetingEditForm meeting={baseMeeting} userId={5} projectId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete meeting" }));
    fireEvent.click(screen.getByRole("button", { name: "No" }));

    expect(screen.getByRole("button", { name: "Delete meeting" })).toBeInTheDocument();
  });

  it("deletes meeting and navigates to list", async () => {
    render(<MeetingEditForm meeting={baseMeeting} userId={5} projectId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete meeting" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, delete" }));

    await waitFor(() => {
      expect(deleteMeetingMock).toHaveBeenCalledWith(1);
    });
    expect(pushMock).toHaveBeenCalledWith("/projects/1/meetings");
  });

  it("shows all team members checkbox checked when all are participants", () => {
    const meeting = {
      ...baseMeeting,
      participants: [{ userId: 1 }, { userId: 2 }, { userId: 3 }],
    };

    render(<MeetingEditForm meeting={meeting} userId={5} projectId={1} />);

    expect(screen.getByLabelText("All team members")).toBeChecked();
    expect(screen.queryByRole("checkbox", { name: /Reggie King/ })).not.toBeInTheDocument();
  });

  it("hides individual checkboxes when all team members is checked", () => {
    render(<MeetingEditForm meeting={baseMeeting} userId={5} projectId={1} />);

    expect(screen.getByRole("checkbox", { name: /Bob Jones/ })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("All team members"));

    expect(screen.queryByRole("checkbox", { name: /Bob Jones/ })).not.toBeInTheDocument();
  });

  it("shows individual participant checkboxes when not inviting all", () => {
    render(<MeetingEditForm meeting={baseMeeting} userId={5} projectId={1} />);

    expect(screen.getByRole("checkbox", { name: /Reggie King/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Alex Smith/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Bob Jones/ })).toBeInTheDocument();
  });

  it("toggles individual participant selection", () => {
    render(<MeetingEditForm meeting={baseMeeting} userId={5} projectId={1} />);

    const bobCheckbox = screen.getByRole("checkbox", { name: /Bob Jones/ });
    expect(bobCheckbox).not.toBeChecked();

    fireEvent.click(bobCheckbox);
    expect(bobCheckbox).toBeChecked();

    fireEvent.click(bobCheckbox);
    expect(bobCheckbox).not.toBeChecked();
  });
});
