import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { EditQuestionnaireQuestionList } from "./EditQuestionnaireQuestionList";

vi.mock("@/shared/ui/Button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/shared/ui/FormField", () => ({
  FormField: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

describe("EditQuestionnaireQuestionList", () => {
  it("supports editing question labels/configs and add/remove controls", () => {
    const setAnswers = vi.fn();
    const questionsState = [
      {
        uiId: 1,
        type: "multiple-choice",
        label: "Choose one",
        configs: { options: ["A", "B"] },
      },
      {
        uiId: 2,
        type: "slider",
        label: "Rate confidence",
        configs: { min: 1, max: 5, step: 1, helperText: "Pick a value", left: "Low", right: "High" },
      },
    ] as any;
    const setQuestions = vi.fn((updater: any) => {
      if (typeof updater === "function") {
        updater(questionsState);
      }
    });
    const setHasUnsavedChanges = vi.fn();
    const addQuestion = vi.fn();

    render(
      <EditQuestionnaireQuestionList
        questions={questionsState}
        preview={false}
        answers={{}}
        setAnswers={setAnswers}
        setQuestions={setQuestions}
        setHasUnsavedChanges={setHasUnsavedChanges}
        disallowTextQuestions={false}
        addQuestion={addQuestion}
      />,
    );

    fireEvent.change(screen.getAllByPlaceholderText("Enter your question")[0], {
      target: { value: "Updated question" },
    });
    expect(setQuestions).toHaveBeenCalled();
    setQuestions.mockClear();

    fireEvent.change(screen.getByPlaceholderText("Helper text shown to students"), {
      target: { value: "New helper" },
    });
    expect(setQuestions).toHaveBeenCalled();
    setQuestions.mockClear();

    fireEvent.change(screen.getByDisplayValue("A"), { target: { value: "Alpha" } });
    expect(setQuestions).toHaveBeenCalled();
    setQuestions.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Add option" }));
    expect(setQuestions).toHaveBeenCalled();
    setQuestions.mockClear();

    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[1]);
    expect(setQuestions).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Add text" }));
    fireEvent.click(screen.getByRole("button", { name: "Add multiple choice" }));
    fireEvent.click(screen.getByRole("button", { name: "Add rating" }));
    fireEvent.click(screen.getByRole("button", { name: "Add slider" }));

    expect(addQuestion).toHaveBeenCalledWith("text");
    expect(addQuestion).toHaveBeenCalledWith("multiple-choice");
    expect(addQuestion).toHaveBeenCalledWith("rating");
    expect(addQuestion).toHaveBeenCalledWith("slider");
    expect(setHasUnsavedChanges).toHaveBeenCalled();
  });

  it("supports preview answer input across all question types", () => {
    const setAnswers = vi.fn();
    const setQuestions = vi.fn();

    const questions = [
      { uiId: 11, type: "text", label: "", configs: {} },
      { uiId: 12, type: "multiple-choice", label: "MC", configs: { options: ["X"] } },
      { uiId: 13, type: "rating", label: "Rate", configs: {} },
      { uiId: 14, type: "slider", label: "Slider", configs: { min: 2, max: 10, step: 2, left: "L", right: "R", helperText: "Help" } },
    ] as any;

    render(
      <EditQuestionnaireQuestionList
        questions={questions}
        preview
        answers={{ 11: "old", 12: "", 13: 4, 14: 6 }}
        setAnswers={setAnswers}
        setQuestions={setQuestions}
        setHasUnsavedChanges={vi.fn()}
        disallowTextQuestions
        addQuestion={vi.fn()}
      />,
    );

    expect(screen.getByText("Untitled question")).toBeInTheDocument();
    expect(screen.getByText("Help")).toBeInTheDocument();
    expect(screen.getByText("Selected: 6")).toBeInTheDocument();

    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "next text" } });
    expect(setAnswers).toHaveBeenCalled();
    setAnswers.mockClear();

    fireEvent.click(screen.getByRole("radio", { name: "X" }));
    expect(setAnswers).toHaveBeenCalled();
    setAnswers.mockClear();

    fireEvent.click(screen.getByRole("radio", { name: "7" }));
    expect(setAnswers).toHaveBeenCalled();
    setAnswers.mockClear();

    fireEvent.change(screen.getByRole("slider"), { target: { value: "8" } });
    expect(setAnswers).toHaveBeenCalled();
  });

  it("hides Add text when text questions are disallowed and applies live question updates", () => {
    function Harness() {
      const [answers, setAnswers] = useState<Record<number, string | number | boolean>>({});
      const [questions, setQuestions] = useState<any[]>([
        { uiId: 21, type: "multiple-choice", label: "Choices", configs: { options: ["A"] } },
      ]);
      const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
      return (
        <>
          <span data-testid="dirty-flag">{String(hasUnsavedChanges)}</span>
          <span data-testid="option-count">
            {(questions[0]?.configs?.options ?? []).length}
          </span>
          <EditQuestionnaireQuestionList
            questions={questions}
            preview={false}
            answers={answers}
            setAnswers={setAnswers}
            setQuestions={setQuestions}
            setHasUnsavedChanges={setHasUnsavedChanges}
            disallowTextQuestions
            addQuestion={vi.fn()}
          />
        </>
      );
    }

    render(<Harness />);

    expect(screen.queryByRole("button", { name: "Add text" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add option" }));
    expect(screen.getByTestId("option-count")).toHaveTextContent("2");
    expect(screen.getByTestId("dirty-flag")).toHaveTextContent("true");
  });
});
