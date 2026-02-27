// src/features/questionnaires/components/NewQuestionnaireClient.test.tsx

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NewQuestionnaireClient from "./NewQuestionnaireClient";

// ✅ Mock Next.js router (App Router)
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// ✅ Mock scrollTo (JSDOM does not implement it)
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});

describe("NewQuestionnaireClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form elements", () => {
    render(<NewQuestionnaireClient />);

    expect(
      screen.getByPlaceholderText("Questionnaire name")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /add slider/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /save/i })
    ).toBeInTheDocument();
  });

  it("shows validation errors when saving empty form", () => {
    render(<NewQuestionnaireClient />);

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      screen.getByText(/questionnaire name is required/i)
    ).toBeInTheDocument();
  });

  it("allows adding a slider question", () => {
    render(<NewQuestionnaireClient />);

    fireEvent.click(screen.getByRole("button", { name: /add slider/i }));

    expect(
      screen.getByPlaceholderText("Question label")
    ).toBeInTheDocument();
  });

  it("validates missing question label", () => {
    render(<NewQuestionnaireClient />);

    fireEvent.change(screen.getByPlaceholderText("Questionnaire name"), {
      target: { value: "Test Questionnaire" },
    });

    fireEvent.click(screen.getByRole("button", { name: /add slider/i }));

    // Do NOT enter question label
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
  });

  it("does not crash when clicking question container (scroll)", () => {
    render(<NewQuestionnaireClient />);

    fireEvent.click(screen.getByRole("button", { name: /add slider/i }));

    const questionLabelInput =
      screen.getByPlaceholderText("Question label");

    expect(() => {
      fireEvent.click(questionLabelInput);
    }).not.toThrow();
  });
});