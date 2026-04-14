import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Page from "./page";

vi.mock("@/features/questionnaires/components/NewQuestionnaireClient", () => ({
  default: () => <div data-testid="new-questionnaire-client" />,
}));

describe("Staff questionnaire new page", () => {
  it("renders NewQuestionnaireClient", () => {
    render(<Page />);
    expect(screen.getByTestId("new-questionnaire-client")).toBeInTheDocument();
  });
});
