import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuestionnaireView } from "./QuestionnaireView";

describe("QuestionnaireView", () => {
  it("shows empty-state message when questionnaire has no questions", () => {
    render(
      <QuestionnaireView
        questionnaire={{ id: 1, templateName: "Empty", questions: [] } as any}
      />
    );

    expect(screen.getByText("No questions in this questionnaire.")).toBeInTheDocument();
  });

  it("renders all supported question types", () => {
    render(
      <QuestionnaireView
        questionnaire={
          {
            id: 1,
            templateName: "All types",
            questions: [
              { id: 1, label: "Text question", type: "text", configs: {} },
              {
                id: 2,
                label: "MC question",
                type: "multiple-choice",
                configs: { options: ["A", "B"] },
              },
              { id: 3, label: "Rating question", type: "rating", configs: { min: 1, max: 3 } },
              {
                id: 4,
                label: "Slider question",
                type: "slider",
                configs: {
                  min: 0,
                  max: 10,
                  step: 2,
                  left: "Low",
                  right: "High",
                  helperText: "Choose a value",
                },
              },
            ],
          } as any
        }
      />
    );

    expect(screen.getByText("1. Text question")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Student response")).toBeDisabled();

    expect(screen.getByText("2. MC question")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();

    expect(screen.getByText("3. Rating question")).toBeInTheDocument();
    expect(screen.getByLabelText("1")).toBeInTheDocument();
    expect(screen.getByLabelText("2")).toBeInTheDocument();
    expect(screen.getByLabelText("3")).toBeInTheDocument();

    expect(screen.getByText("4. Slider question")).toBeInTheDocument();
    expect(screen.getByText("Choose a value")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();

    const range = screen.getByRole("slider");
    expect(range).toHaveAttribute("min", "0");
    expect(range).toHaveAttribute("max", "10");
    expect(range).toHaveAttribute("step", "2");
    expect(range).toBeDisabled();
  });
});
