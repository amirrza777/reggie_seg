import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Page from "./page";

vi.mock("@/features/questionnaires/components/EditQuestionnaireClient", () => ({
  default: () => <div data-testid="edit-questionnaire-client" />,
}));

describe("Staff questionnaire edit page", () => {
  it("renders EditQuestionnaireClient", () => {
    render(<Page />);
    expect(screen.getByTestId("edit-questionnaire-client")).toBeInTheDocument();
  });
});
