import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffCustomisedAllocationPanelStep2 } from "./StaffCustomisedAllocationPanel.step2";

const question = { id: 1, label: "Work style", type: "multiple-choice" };

function renderStep2(overrides: Record<string, unknown> = {}) {
  const props = {
    criteriaQuestions: [],
    criteriaConfigByQuestionId: {},
    updateStrategy: vi.fn(),
    updateWeight: vi.fn(),
    confirmApply: false,
    isPreviewPending: false,
    isApplyPending: false,
    ...overrides,
  };
  render(<StaffCustomisedAllocationPanelStep2 {...(props as never)} />);
  return props;
}

describe("StaffCustomisedAllocationPanelStep2", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows empty-state note when no criteria questions are present", () => {
    renderStep2();
    expect(screen.getByText(/Select a questionnaire to configure criteria/i)).toBeInTheDocument();
  });

  it("renders a criterion row with strategy and weight controls", () => {
    renderStep2({
      criteriaQuestions: [question],
      criteriaConfigByQuestionId: { 1: { strategy: "diversify", weight: 1 } },
    });
    expect(screen.getByText("Work style")).toBeInTheDocument();
    expect(screen.getByLabelText("Strategy for Work style")).toHaveValue("diversify");
    expect(screen.getByLabelText("Weight for Work style")).toHaveValue("1");
  });

  it("uses default config when question has no entry in criteriaConfigByQuestionId", () => {
    renderStep2({ criteriaQuestions: [question], criteriaConfigByQuestionId: {} });
    expect(screen.getByLabelText("Strategy for Work style")).toHaveValue("diversify");
  });

  it("calls updateStrategy when strategy select changes", () => {
    const props = renderStep2({
      criteriaQuestions: [question],
      criteriaConfigByQuestionId: { 1: { strategy: "diversify", weight: 1 } },
    });
    fireEvent.change(screen.getByLabelText("Strategy for Work style"), { target: { value: "group" } });
    expect(props.updateStrategy).toHaveBeenCalledWith(1, "group");
  });

  it("calls updateWeight when weight select changes", () => {
    const props = renderStep2({
      criteriaQuestions: [question],
      criteriaConfigByQuestionId: { 1: { strategy: "diversify", weight: 1 } },
    });
    fireEvent.change(screen.getByLabelText("Weight for Work style"), { target: { value: "3" } });
    expect(props.updateWeight).toHaveBeenCalledWith(1, 3);
  });

  it("disables weight select when strategy is ignore", () => {
    renderStep2({
      criteriaQuestions: [question],
      criteriaConfigByQuestionId: { 1: { strategy: "ignore", weight: 1 } },
    });
    expect(screen.getByLabelText("Weight for Work style")).toBeDisabled();
  });

  it("disables all controls when confirmApply is true", () => {
    renderStep2({
      criteriaQuestions: [question],
      criteriaConfigByQuestionId: { 1: { strategy: "diversify", weight: 1 } },
      confirmApply: true,
    });
    expect(screen.getByLabelText("Strategy for Work style")).toBeDisabled();
    expect(screen.getByLabelText("Weight for Work style")).toBeDisabled();
  });
});