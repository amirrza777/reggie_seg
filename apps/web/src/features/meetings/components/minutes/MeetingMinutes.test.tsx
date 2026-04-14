import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MeetingMinutes } from "./MeetingMinutes";

const saveNowMock = vi.fn();

vi.mock("../../hooks/useAutosave", () => ({
  useAutosave: vi.fn(() => ({ status: "idle", saveNow: saveNowMock })),
}));

vi.mock("../../api/client", () => ({
  saveMinutes: vi.fn(),
}));

vi.mock("@/shared/ui/rich-text/RichTextEditor", () => ({
  RichTextEditor: ({ onChange, placeholder }: any) => (
    <textarea data-testid="editor" placeholder={placeholder} onChange={(e: any) => onChange(e.target.value)} />
  ),
}));

import { useAutosave } from "../../hooks/useAutosave";
import { saveMinutes } from "../../api/client";

const useAutosaveMock = vi.mocked(useAutosave);
const saveMinutesMock = vi.mocked(saveMinutes);

describe("MeetingMinutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAutosaveMock.mockReturnValue({ status: "idle", saveNow: saveNowMock });
  });

  it("renders the editor and save button", () => {
    render(<MeetingMinutes meetingId={1} writerId={1} initialContent="" />);
    expect(screen.getByTestId("editor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save minutes" })).toBeInTheDocument();
  });

  it("passes placeholder to the editor", () => {
    render(<MeetingMinutes meetingId={1} writerId={1} initialContent="" />);
    expect(screen.getByPlaceholderText("Capture decisions, risks, and action items...")).toBeInTheDocument();
  });

  it("calls saveNow when save button is clicked", () => {
    render(<MeetingMinutes meetingId={1} writerId={1} initialContent="" />);
    fireEvent.click(screen.getByRole("button", { name: "Save minutes" }));
    expect(saveNowMock).toHaveBeenCalled();
  });

  it("shows saving status", () => {
    useAutosaveMock.mockReturnValue({ status: "saving", saveNow: saveNowMock });
    render(<MeetingMinutes meetingId={1} writerId={1} initialContent="" />);
    expect(screen.getByText("Saving…")).toBeInTheDocument();
  });

  it("shows saved status", () => {
    useAutosaveMock.mockReturnValue({ status: "saved", saveNow: saveNowMock });
    render(<MeetingMinutes meetingId={1} writerId={1} initialContent="" />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("shows error status", () => {
    useAutosaveMock.mockReturnValue({ status: "error", saveNow: saveNowMock });
    render(<MeetingMinutes meetingId={1} writerId={1} initialContent="" />);
    expect(screen.getByText("Save failed")).toBeInTheDocument();
  });

  it("passes initial content to useAutosave", () => {
    render(<MeetingMinutes meetingId={5} writerId={3} initialContent="old notes" />);
    expect(useAutosaveMock).toHaveBeenCalledWith("old notes", expect.objectContaining({ onSave: expect.any(Function) }));
  });

  it("onSave sends the right data to saveMinutes", () => {
    render(<MeetingMinutes meetingId={5} writerId={3} initialContent="" />);
    const onSave = useAutosaveMock.mock.calls[0][1].onSave;
    onSave("updated notes");
    expect(saveMinutesMock).toHaveBeenCalledWith(5, 3, "updated notes");
  });

  it("updates content when editor changes", () => {
    render(<MeetingMinutes meetingId={1} writerId={1} initialContent="" />);
    fireEvent.change(screen.getByTestId("editor"), { target: { value: "new notes" } });
    expect(useAutosaveMock).toHaveBeenLastCalledWith("new notes", expect.objectContaining({ onSave: expect.any(Function) }));
  });
});
