import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffMarkingCard } from "./StaffMarkingCard";
import { saveStudentMarking, saveTeamMarking } from "../api/client";

vi.mock("../api/client", () => ({
  saveStudentMarking: vi.fn(),
  saveTeamMarking: vi.fn(),
}));

vi.mock("@/shared/ui/Button", () => ({
  Button: ({ children, ...props }: { children: ReactNode } & Record<string, unknown>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ title, children }: { title: ReactNode; children: ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock("@/shared/ui/FormField", () => ({
  FormField: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/shared/ui/rich-text/RichTextEditor", () => ({
  RichTextEditor: ({
    initialContent,
    onChange,
    onEmptyChange,
    readOnly,
    placeholder,
  }: {
    initialContent: string;
    onChange: (value: string) => void;
    onEmptyChange?: (isEmpty: boolean) => void;
    readOnly?: boolean;
    placeholder?: string;
  }) => (
    <textarea
      aria-label="Formative feedback editor"
      defaultValue={initialContent}
      placeholder={placeholder}
      readOnly={readOnly}
      onChange={(event) => {
        onChange(event.currentTarget.value);
        onEmptyChange?.(event.currentTarget.value.trim().length === 0);
      }}
    />
  ),
}));

const saveTeamMarkingMock = vi.mocked(saveTeamMarking);
const saveStudentMarkingMock = vi.mocked(saveStudentMarking);

describe("StaffMarkingCard", () => {
  function submitFormForSaveButton() {
    const saveButton = screen.getByRole("button", { name: /save marking|update marking/i });
    const form = saveButton.closest("form");
    if (!form) throw new Error("Expected save button to be inside a form");
    fireEvent.submit(form);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows default marker text when no marking exists", () => {
    render(
      <StaffMarkingCard
        title="Team marking"
        description="desc"
        staffId={1}
        moduleId={2}
        teamId={3}
        initialMarking={null}
      />,
    );

    expect(screen.getByText("Last updated by Not yet marked.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save marking" })).toBeInTheDocument();
  });

  it("falls back to staff id and unknown time for invalid marker values", () => {
    render(
      <StaffMarkingCard
        title="Team marking"
        description="desc"
        staffId={1}
        moduleId={2}
        teamId={3}
        initialMarking={{
          mark: 70,
          formativeFeedback: "Keep going",
          updatedAt: "not-a-date",
          marker: { id: 44, firstName: "", lastName: "" },
        }}
      />,
    );

    expect(screen.getByText("Last updated by Staff 44 on Unknown time.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("70")).toBeInTheDocument();
  });

  it("validates mark range before save", async () => {
    render(
      <StaffMarkingCard
        title="Team marking"
        description="desc"
        staffId={1}
        moduleId={2}
        teamId={3}
        initialMarking={null}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. 72.5"), { target: { value: "101" } });
    submitFormForSaveButton();

    expect(await screen.findByText("Mark must be a number between 0 and 100.")).toBeInTheDocument();
    expect(saveTeamMarkingMock).not.toHaveBeenCalled();
  });

  it("saves team marking with rounded mark and feedback", async () => {
    saveTeamMarkingMock.mockResolvedValue({
      mark: 72.35,
      formativeFeedback: "Updated feedback",
      updatedAt: "2026-04-05T10:20:30.000Z",
      marker: { id: 7, firstName: "Ada", lastName: "Lovelace" },
    });

    render(
      <StaffMarkingCard
        title="Team marking"
        description="desc"
        staffId={1}
        moduleId={2}
        teamId={3}
        initialMarking={null}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. 72.5"), { target: { value: "72.349" } });
    fireEvent.change(screen.getByLabelText("Formative feedback editor"), {
      target: { value: "Updated feedback" },
    });
    submitFormForSaveButton();

    await waitFor(() => {
      expect(saveTeamMarkingMock).toHaveBeenCalledWith(1, 2, 3, {
        mark: 72.35,
        formativeFeedback: "Updated feedback",
      });
    });

    expect(await screen.findByText("Marking and formative feedback saved.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update marking" })).toBeInTheDocument();
  });

  it("saves student marking when student id is provided", async () => {
    saveStudentMarkingMock.mockResolvedValue({
      mark: 55,
      formativeFeedback: null,
      updatedAt: "2026-04-05T11:20:30.000Z",
      marker: { id: 7, firstName: "Ada", lastName: "Lovelace" },
    });

    render(
      <StaffMarkingCard
        title="Student marking"
        description="desc"
        staffId={11}
        moduleId={12}
        teamId={13}
        studentId={14}
        initialMarking={null}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. 72.5"), { target: { value: "55" } });
    submitFormForSaveButton();

    await waitFor(() => {
      expect(saveStudentMarkingMock).toHaveBeenCalledWith(11, 12, 13, 14, {
        mark: 55,
        formativeFeedback: null,
      });
    });
  });

  it("clears marking and feedback", async () => {
    saveTeamMarkingMock.mockResolvedValue({
      mark: null,
      formativeFeedback: null,
      updatedAt: "2026-04-05T11:20:30.000Z",
      marker: { id: 8, firstName: "Grace", lastName: "Hopper" },
    });

    render(
      <StaffMarkingCard
        title="Team marking"
        description="desc"
        staffId={1}
        moduleId={2}
        teamId={3}
        initialMarking={{
          mark: 66,
          formativeFeedback: "Old feedback",
          updatedAt: "2026-04-05T10:00:00.000Z",
          marker: { id: 1, firstName: "A", lastName: "B" },
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() => {
      expect(saveTeamMarkingMock).toHaveBeenCalledWith(1, 2, 3, {
        mark: null,
        formativeFeedback: null,
      });
    });
  });

  it("shows save error message", async () => {
    saveTeamMarkingMock.mockRejectedValue(new Error("Cannot save"));

    render(
      <StaffMarkingCard
        title="Team marking"
        description="desc"
        staffId={1}
        moduleId={2}
        teamId={3}
        initialMarking={null}
      />,
    );

    submitFormForSaveButton();

    expect(await screen.findByText("Cannot save")).toBeInTheDocument();
  });

  it("renders read-only mode and hides action buttons", () => {
    render(
      <StaffMarkingCard
        title="Team marking"
        description="desc"
        staffId={1}
        moduleId={2}
        teamId={3}
        initialMarking={null}
        readOnly
      />,
    );

    expect(screen.getByText("This module is archived; marking is read-only.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save marking" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });
});
