import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewQuestionnaireClient from "./NewQuestionnaireClient";
import { apiFetch } from "@/shared/api/http";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/shared/api/http", () => ({
  apiFetch: vi.fn(),
}));

describe("NewQuestionnaireClient", () => {
  const apiFetchMock = vi.mocked(apiFetch);
  let alertSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    push.mockReset();
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({});
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("shows base validation errors on first render", () => {
    render(<NewQuestionnaireClient />);

    expect(screen.getByText("Questionnaire name is required.")).toBeInTheDocument();
    expect(screen.getByText("At least one question is required.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves a valid questionnaire and returns to questionnaires list", async () => {
    render(<NewQuestionnaireClient />);

    fireEvent.change(screen.getByPlaceholderText("Questionnaire name"), {
      target: { value: "Sprint Reflection" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add text" }));
    fireEvent.change(screen.getByPlaceholderText("Question label"), {
      target: { value: "What should we improve next sprint?" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/questionnaires/new",
        expect.objectContaining({ method: "POST" })
      );
    });

    const [, init] = apiFetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));

    expect(body.templateName).toBe("Sprint Reflection");
    expect(body.questions).toHaveLength(1);
    expect(body.questions[0]).toMatchObject({
      label: "What should we improve next sprint?",
      type: "text",
    });

    await waitFor(() => expect(push).toHaveBeenCalledWith("/staff/questionnaires"));
  });

  it("blocks save for invalid multiple-choice options", () => {
    render(<NewQuestionnaireClient />);

    fireEvent.change(screen.getByPlaceholderText("Questionnaire name"), {
      target: { value: "Peer Feedback" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add multiple choice" }));
    fireEvent.change(screen.getByPlaceholderText("Question label"), {
      target: { value: "How clear was communication?" },
    });

    const removeOptionButtons = screen.getAllByRole("button", { name: "✕" });
    fireEvent.click(removeOptionButtons[0]);

    expect(screen.getByText("Question 1 must have at least two options.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("toggles preview mode and hides editor-only controls", () => {
    render(<NewQuestionnaireClient />);

    fireEvent.click(screen.getByRole("button", { name: "Add text" }));
    fireEvent.click(screen.getByRole("button", { name: "Student preview" }));

    expect(screen.getByText("Student preview (not saved)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Questionnaire name")).not.toBeInTheDocument();
  });

  it("shows alert on API failure and does not navigate", async () => {
    apiFetchMock.mockRejectedValueOnce(new Error("boom"));
    render(<NewQuestionnaireClient />);

    fireEvent.change(screen.getByPlaceholderText("Questionnaire name"), {
      target: { value: "Team Survey" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add text" }));
    fireEvent.change(screen.getByPlaceholderText("Question label"), {
      target: { value: "How can we collaborate better?" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Save failed — check console");
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("asks for confirmation on cancel when there are unsaved changes", () => {
    confirmSpy.mockReturnValueOnce(false);
    render(<NewQuestionnaireClient />);

    fireEvent.change(screen.getByPlaceholderText("Questionnaire name"), {
      target: { value: "Draft questionnaire" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "You have unsaved changes. Are you sure you want to exit without saving?"
    );
    expect(push).not.toHaveBeenCalled();
  });
});
