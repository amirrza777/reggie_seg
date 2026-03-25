import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { StaffCustomisedAllocationCriteriaStep } from "./StaffCustomisedAllocationCriteriaStep";

const question = { id: 101, label: "Preferred working style", type: "multiple-choice" as const };

function renderStep(
  overrides: Partial<ComponentProps<typeof StaffCustomisedAllocationCriteriaStep>> = {},
) {
  const props = {
    criteriaQuestions: [question],
    criteriaConfigByQuestionId: { 101: { strategy: "diversify" as const, weight: 1 } },
    updateStrategy: vi.fn(),
    updateWeight: vi.fn(),
    confirmApply: false,
    isPreviewPending: false,
    isApplyPending: false,
    ...overrides,
  };
  render(<StaffCustomisedAllocationCriteriaStep {...props} />);
  return props;
}

describe("StaffCustomisedAllocationCriteriaStep", () => {
  it("shows questionnaire selection hint when no criteria exist", () => {
    renderStep({ criteriaQuestions: [] });
    expect(screen.getByText("Select a questionnaire to configure criteria.")).toBeInTheDocument();
  });

  it("updates strategy and weight through callbacks", () => {
    const props = renderStep();
    fireEvent.change(screen.getByLabelText("Strategy for Preferred working style"), {
      target: { value: "group" },
    });
    fireEvent.change(screen.getByLabelText("Weight for Preferred working style"), {
      target: { value: "3" },
    });
    expect(props.updateStrategy).toHaveBeenCalledWith(101, "group");
    expect(props.updateWeight).toHaveBeenCalledWith(101, 3);
  });

  it("disables weight picker when strategy is ignore", () => {
    renderStep({ criteriaConfigByQuestionId: { 101: { strategy: "ignore", weight: 1 } } });
    expect(screen.getByLabelText("Weight for Preferred working style")).toBeDisabled();
  });
});