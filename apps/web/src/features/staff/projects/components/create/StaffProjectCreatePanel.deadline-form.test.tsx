import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StaffProjectCreatePanelDeadlineForm } from "./StaffProjectCreatePanel.deadline-form";

const baseDeadline = {
  taskOpenDate: "2026-01-01T09:00",
  taskDueDate: "2026-01-10T09:00",
  taskDueDateMcf: "2026-01-17T09:00",
  assessmentOpenDate: "2026-01-11T09:00",
  assessmentDueDate: "2026-01-15T09:00",
  assessmentDueDateMcf: "2026-01-22T09:00",
  feedbackOpenDate: "2026-01-16T09:00",
  feedbackDueDate: "2026-01-20T09:00",
  feedbackDueDateMcf: "2026-01-27T09:00",
  teamAllocationQuestionnaireOpenDate: "2025-12-24T09:00",
  teamAllocationQuestionnaireDueDate: "2025-12-31T09:00",
};

const basePreview = {
  taskOpenDate: new Date("2026-01-01T09:00:00.000Z"),
  taskDueDate: new Date("2026-01-10T09:00:00.000Z"),
  taskDueDateMcf: new Date("2026-01-17T09:00:00.000Z"),
  assessmentOpenDate: new Date("2026-01-11T09:00:00.000Z"),
  assessmentDueDate: new Date("2026-01-15T09:00:00.000Z"),
  assessmentDueDateMcf: new Date("2026-01-22T09:00:00.000Z"),
  feedbackOpenDate: new Date("2026-01-16T09:00:00.000Z"),
  feedbackDueDate: new Date("2026-01-20T09:00:00.000Z"),
  feedbackDueDateMcf: new Date("2026-01-27T09:00:00.000Z"),
  totalDays: 2,
};

function renderForm(overrides: Record<string, unknown> = {}) {
  const props = {
    deadline: baseDeadline,
    setDeadline: vi.fn(),
    deadlinePreview: basePreview,
    deadlinePresetStatus: "Preset applied",
    deadlinePresetError: "Preset failed",
    hasSelectedAllocationTemplate: true,
    onApplyMcfOffsetDays: vi.fn(),
    onApplySchedulePreset: vi.fn(),
    onResetSchedulePreset: vi.fn(),
    ...overrides,
  };

  render(<StaffProjectCreatePanelDeadlineForm {...(props as never)} />);
  return props;
}

describe("StaffProjectCreatePanelDeadlineForm", () => {
  it("renders allocation controls, preset feedback, and dispatches preset handlers", () => {
    const props = renderForm();

    expect(screen.getByText("Preset applied")).toBeInTheDocument();
    expect(screen.getByText("Preset failed")).toBeInTheDocument();
    expect(screen.getByText("Allocation questionnaire opens")).toBeInTheDocument();
    expect(screen.getByText("Allocation questionnaire due")).toBeInTheDocument();
    expect(screen.getByText(/Allocation questionnaire window is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Total project window: 2 days/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Use 6-week schedule/i }));
    fireEvent.click(screen.getByRole("button", { name: /Use 8-week schedule/i }));
    fireEvent.click(screen.getByRole("button", { name: /Reset dates/i }));
    fireEvent.click(screen.getByRole("button", { name: /Set MCF \+7 days/i }));
    fireEvent.click(screen.getByRole("button", { name: /Set MCF \+14 days/i }));

    expect(props.onApplySchedulePreset).toHaveBeenNthCalledWith(1, 6);
    expect(props.onApplySchedulePreset).toHaveBeenNthCalledWith(2, 8);
    expect(props.onResetSchedulePreset).toHaveBeenCalled();
    expect(props.onApplyMcfOffsetDays).toHaveBeenNthCalledWith(1, 7);
    expect(props.onApplyMcfOffsetDays).toHaveBeenNthCalledWith(2, 14);
  });

  it("updates each deadline field through setDeadline updater callbacks", () => {
    let current = { ...baseDeadline };
    const setDeadline = vi.fn((updater: ((prev: typeof baseDeadline) => typeof baseDeadline) | typeof baseDeadline) => {
      current = typeof updater === "function" ? updater(current) : updater;
    });
    renderForm({ setDeadline });

    const assertFieldUpdate = (label: string | RegExp, key: keyof typeof baseDeadline, value: string) => {
      const beforeCalls = setDeadline.mock.calls.length;
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
      expect(setDeadline.mock.calls.length).toBe(beforeCalls + 1);
      expect(current[key]).toBe(value);
    };

    assertFieldUpdate(/^Allocation questionnaire opens$/i, "teamAllocationQuestionnaireOpenDate", "2025-12-25T09:00");
    assertFieldUpdate(/^Allocation questionnaire due$/i, "teamAllocationQuestionnaireDueDate", "2025-12-30T09:00");
    assertFieldUpdate(/^Task opens$/i, "taskOpenDate", "2026-01-02T09:00");
    assertFieldUpdate(/^Task due$/i, "taskDueDate", "2026-01-12T09:00");
    assertFieldUpdate("Assessment opens", "assessmentOpenDate", "2026-01-13T09:00");
    assertFieldUpdate("Assessment due", "assessmentDueDate", "2026-01-16T09:00");
    assertFieldUpdate("Feedback opens", "feedbackOpenDate", "2026-01-17T09:00");
    assertFieldUpdate("Feedback due", "feedbackDueDate", "2026-01-21T09:00");
    assertFieldUpdate("MCF task due", "taskDueDateMcf", "2026-01-18T09:00");
    assertFieldUpdate("MCF assessment due", "assessmentDueDateMcf", "2026-01-23T09:00");
    assertFieldUpdate("MCF feedback due", "feedbackDueDateMcf", "2026-01-28T09:00");
  });

  it("hides allocation inputs and shows dash when totalDays is missing", () => {
    renderForm({
      hasSelectedAllocationTemplate: false,
      deadlinePresetStatus: null,
      deadlinePresetError: null,
      deadlinePreview: { ...basePreview, totalDays: null },
    });

    expect(screen.queryByText("Allocation questionnaire opens")).not.toBeInTheDocument();
    expect(screen.queryByText(/Allocation questionnaire window is required/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Total project window:/i)).toHaveTextContent("Total project window: -");
  });
});
