import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { QuestionnaireBuilder } from "./QuestionnaireBuilder";

describe("QuestionnaireBuilder", () => {
  it("renders default questions", () => {
    render(<QuestionnaireBuilder />);
    expect(screen.getByText("What went well?")).toBeInTheDocument();
    expect(screen.getByText("What could be improved?")).toBeInTheDocument();
    expect(screen.getByText("Collaboration score (1-5)")).toBeInTheDocument();
  });

  it("renders provided questions", () => {
    render(
      <QuestionnaireBuilder
        questions={[
          { id: "q1", prompt: "How was planning?", type: "text" },
          { id: "q2", prompt: "Rate teamwork", type: "scale" },
        ]}
      />,
    );

    expect(screen.getByText("How was planning?")).toBeInTheDocument();
    expect(screen.getByText("Rate teamwork")).toBeInTheDocument();
  });
});
