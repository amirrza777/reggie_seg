import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, type MockedFunction } from "vitest";

vi.mock("@/features/auth/useUser", () => ({
  useUser: vi.fn(),
}));

vi.mock("../api/client", () => ({
  createMeeting: vi.fn(),
  listTeamMembers: vi.fn(),
}));

vi.mock("@/shared/ui/RichTextEditor", () => ({
  RichTextEditor: ({ onChange, placeholder }: { onChange: (v: string) => void; placeholder?: string }) => (
    <textarea aria-label="Agenda" placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import { useUser } from "@/features/auth/useUser";
import { createMeeting, listTeamMembers } from "../api/client";
import { CreateMeetingForm } from "./CreateMeetingForm";

const useUserMock = useUser as MockedFunction<typeof useUser>;
const createMeetingMock = createMeeting as MockedFunction<typeof createMeeting>;
const listTeamMembersMock = listTeamMembers as MockedFunction<typeof listTeamMembers>;
type UseUserValue = ReturnType<typeof useUser>;

const onCreated = vi.fn();
const onCancel = vi.fn();

function makeUseUserValue(user: UseUserValue["user"]): UseUserValue {
  return {
    user,
    loading: false,
    setUser: vi.fn(),
    refresh: vi.fn().mockResolvedValue(user),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useUserMock.mockReturnValue(makeUseUserValue({ id: 1, firstName: "Reggie", lastName: "King" } as UseUserValue["user"]));
  createMeetingMock.mockResolvedValue(undefined);
  listTeamMembersMock.mockResolvedValue([]);
});

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Team Meeting" } });
  fireEvent.change(screen.getByLabelText(/date/i), { target: { value: "2026-03-01T10:00" } });
}

describe("CreateMeetingForm", () => {
  it("renders all form fields", async () => {
    await act(async () => {
      render(<CreateMeetingForm teamId={1} onCreated={onCreated} onCancel={onCancel} />);
    });
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/agenda/i)).toBeInTheDocument();
  });

  it("calls onCancel when cancel button is clicked", async () => {
    await act(async () => {
      render(<CreateMeetingForm teamId={1} onCreated={onCreated} onCancel={onCancel} />);
    });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("does not submit when required fields are empty", async () => {
    await act(async () => {
      render(<CreateMeetingForm teamId={1} onCreated={onCreated} onCancel={onCancel} />);
    });
    fireEvent.click(screen.getByRole("button", { name: /create meeting/i }));
    expect(createMeetingMock).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a title.")).toBeInTheDocument();
    expect(screen.getByText("Select a date and time.")).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/date/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("clears field errors as required fields are completed", async () => {
    await act(async () => {
      render(<CreateMeetingForm teamId={1} onCreated={onCreated} onCancel={onCancel} />);
    });

    fireEvent.click(screen.getByRole("button", { name: /create meeting/i }));
    expect(screen.getByText("Enter a title.")).toBeInTheDocument();
    expect(screen.getByText("Select a date and time.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Team Meeting" } });
    expect(screen.queryByText("Enter a title.")).not.toBeInTheDocument();
    expect(screen.getByText("Select a date and time.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: "2026-03-01T10:00" } });
    expect(screen.queryByText("Select a date and time.")).not.toBeInTheDocument();
  });

  it("submits with required fields and calls onCreated", async () => {
    render(<CreateMeetingForm teamId={1} onCreated={onCreated} onCancel={onCancel} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /create meeting/i }));
    await waitFor(() => expect(createMeetingMock).toHaveBeenCalledWith({
      teamId: 1,
      organiserId: 1,
      title: "Team Meeting",
      date: "2026-03-01T10:00",
      subject: undefined,
      location: undefined,
      agenda: undefined,
    }));
    expect(onCreated).toHaveBeenCalled();
    expect(await screen.findByText(/meeting created/i)).toBeInTheDocument();
  });

  it("submits with optional fields included", async () => {
    render(<CreateMeetingForm teamId={1} onCreated={onCreated} onCancel={onCancel} />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Week 8 review" } });
    fireEvent.change(screen.getByLabelText(/location/i), { target: { value: "Bush House 3.01" } });
    fireEvent.change(screen.getByLabelText(/agenda/i), { target: { value: "Review tasks and plan next sprint" } });
    fireEvent.click(screen.getByRole("button", { name: /create meeting/i }));
    await waitFor(() => expect(createMeetingMock).toHaveBeenCalledWith({
      teamId: 1,
      organiserId: 1,
      title: "Team Meeting",
      date: "2026-03-01T10:00",
      subject: "Week 8 review",
      location: "Bush House 3.01",
      agenda: "Review tasks and plan next sprint",
    }));
  });

  it("clears form fields after successful submission", async () => {
    render(<CreateMeetingForm teamId={1} onCreated={onCreated} onCancel={onCancel} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /create meeting/i }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(screen.getByLabelText(/title/i)).toHaveValue("");
    expect(screen.getByLabelText(/date/i)).toHaveValue("");
  });

  it("shows error message when creation fails", async () => {
    createMeetingMock.mockRejectedValue(new Error("Server error"));
    render(<CreateMeetingForm teamId={1} onCreated={onCreated} onCancel={onCancel} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /create meeting/i }));
    await waitFor(() => expect(screen.getByText(/server error/i)).toBeInTheDocument());
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("shows fallback error for non-Error rejection", async () => {
    createMeetingMock.mockRejectedValue("unknown");
    render(<CreateMeetingForm teamId={1} onCreated={onCreated} onCancel={onCancel} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /create meeting/i }));
    await waitFor(() => expect(screen.getByText(/failed to create meeting/i)).toBeInTheDocument());
  });

  it("disables submit button while loading", async () => {
    let resolve: () => void;
    createMeetingMock.mockReturnValue(new Promise((r) => { resolve = r as () => void; }));
    render(<CreateMeetingForm teamId={1} onCreated={onCreated} onCancel={onCancel} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /create meeting/i }));
    expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
    resolve!();
    await waitFor(() => expect(screen.getByText(/meeting created/i)).toBeInTheDocument());
  });

  it("disables submit button when no user is logged in", async () => {
    useUserMock.mockReturnValue(makeUseUserValue(null));
    await act(async () => {
      render(<CreateMeetingForm teamId={1} onCreated={onCreated} onCancel={onCancel} />);
    });
    expect(screen.getByRole("button", { name: /create meeting/i })).toBeDisabled();
  });
});
