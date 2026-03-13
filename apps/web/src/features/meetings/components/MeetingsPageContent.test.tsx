import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MeetingsPageContent } from "./MeetingsPageContent";

vi.mock("../api/client", () => ({
  listMeetings: vi.fn(),
}));

vi.mock("./MeetingList", () => ({
  MeetingList: ({ meetings, onCreateNew }: any) => (
    <div data-testid="meeting-list">
      <span>{meetings.length} meetings</span>
      <button type="button" onClick={onCreateNew}>New Meeting</button>
    </div>
  ),
}));

vi.mock("./CreateMeetingForm", () => ({
  CreateMeetingForm: ({ onCreated, onCancel }: any) => (
    <div data-testid="create-form">
      <button type="button" onClick={onCreated}>submit</button>
      <button type="button" onClick={onCancel}>cancel</button>
    </div>
  ),
}));

import { listMeetings } from "../api/client";
import { fireEvent } from "@testing-library/react";

const listMeetingsMock = vi.mocked(listMeetings);

describe("MeetingsPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMeetingsMock.mockResolvedValue([
      { id: 1, title: "Team Meeting" },
      { id: 2, title: "Group Check-in" },
    ] as any);
  });

  it("fetches and displays meetings", async () => {
    render(<MeetingsPageContent teamId={10} projectId={1} />);
    await waitFor(() => {
      expect(screen.getByText("2 meetings")).toBeInTheDocument();
    });
    expect(listMeetingsMock).toHaveBeenCalledWith(10);
  });

  it("shows create form when New Meeting is clicked", async () => {
    render(<MeetingsPageContent teamId={10} projectId={1} />);
    await waitFor(() => screen.getByText("2 meetings"));
    fireEvent.click(screen.getByRole("button", { name: "New Meeting" }));
    expect(screen.getByTestId("create-form")).toBeInTheDocument();
  });

  it("hides create form on cancel", async () => {
    render(<MeetingsPageContent teamId={10} projectId={1} />);
    await waitFor(() => screen.getByText("2 meetings"));
    fireEvent.click(screen.getByRole("button", { name: "New Meeting" }));
    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(screen.queryByTestId("create-form")).not.toBeInTheDocument();
  });

  it("refreshes list and hides form after creating a meeting", async () => {
    render(<MeetingsPageContent teamId={10} projectId={1} />);
    await waitFor(() => screen.getByText("2 meetings"));
    fireEvent.click(screen.getByRole("button", { name: "New Meeting" }));
    fireEvent.click(screen.getByRole("button", { name: "submit" }));
    await waitFor(() => {
      expect(listMeetingsMock).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByTestId("create-form")).not.toBeInTheDocument();
  });
});
