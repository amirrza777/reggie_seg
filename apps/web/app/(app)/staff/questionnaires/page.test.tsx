import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import QuestionnairesPage from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/questionnaires/components/QuestionnaireList", () => ({
  QuestionnaireList: () => <div data-testid="questionnaire-list" />,
}));

describe("QuestionnairesPage", () => {
  it("renders questionnaires hero with create action and list", () => {
    render(<QuestionnairesPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Questionnaires" })).toBeInTheDocument();
    expect(screen.getByText("Create, view, and manage questionnaire templates.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+ Create questionnaire" })).toHaveAttribute(
      "href",
      "/staff/questionnaires/new",
    );
    expect(screen.getByTestId("questionnaire-list")).toBeInTheDocument();
  });
});
