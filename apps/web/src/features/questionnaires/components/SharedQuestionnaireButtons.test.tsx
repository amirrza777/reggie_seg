import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/errors";
import {
  CancelQuestionnaireButton,
  DeleteQuestionnaireButton,
  EditQuestionnaireButton,
  QuestionnaireVisibilityButtons,
} from "./SharedQuestionnaireButtons";
import { deleteQuestionnaire } from "../api/client";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("../api/client", () => ({
  deleteQuestionnaire: vi.fn(),
}));

describe("SharedQuestionnaireButtons", () => {
  const deleteQuestionnaireMock = vi.mocked(deleteQuestionnaire);
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    deleteQuestionnaireMock.mockReset();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("toggles visibility buttons", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuestionnaireVisibilityButtons isPublic={false} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /About private and public questionnaire visibility/i }));
    const dialog = screen.getByRole("dialog", { name: /Questionnaire visibility/i });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByText(/Private templates are only visible to your account/i),
    ).toBeInTheDocument();
    fireEvent.click(dialog);

    fireEvent.click(screen.getByRole("button", { name: "Public" }));
    fireEvent.click(screen.getByRole("button", { name: "Private" }));

    expect(onChange).toHaveBeenNthCalledWith(1, true);
    expect(onChange).toHaveBeenNthCalledWith(2, false);
  });

  it("runs cancel without confirm when confirmWhen=false", () => {
    const onCancel = vi.fn();
    render(<CancelQuestionnaireButton onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: /discard unsaved changes/i })).not.toBeInTheDocument();
  });

  it("blocks cancel when confirmation is rejected", () => {
    const onCancel = vi.fn();
    render(<CancelQuestionnaireButton onCancel={onCancel} confirmWhen />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    const dialog = screen.getByRole("dialog", { name: /discard unsaved changes/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /stay here/i }));

    expect(onCancel).not.toHaveBeenCalled();
  });

  it("navigates to edit page from EditQuestionnaireButton", () => {
    render(<EditQuestionnaireButton questionnaireId={44} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(push).toHaveBeenCalledWith("/staff/questionnaires/44/edit");
  });

  it("does not delete when confirmation is rejected", async () => {
    render(<DeleteQuestionnaireButton questionnaireId={12} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: /delete questionnaire/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => expect(deleteQuestionnaireMock).not.toHaveBeenCalled());
  });

  it("calls onDeleted callback after successful delete", async () => {
    deleteQuestionnaireMock.mockResolvedValue(undefined as any);
    const onDeleted = vi.fn();
    render(<DeleteQuestionnaireButton questionnaireId={12} onDeleted={onDeleted} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: /delete questionnaire/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /delete questionnaire/i }));

    await waitFor(() => expect(deleteQuestionnaireMock).toHaveBeenCalledWith(12));
    expect(onDeleted).toHaveBeenCalledWith(12);
    expect(push).not.toHaveBeenCalled();
  });

  it("navigates and refreshes after successful delete without callback", async () => {
    deleteQuestionnaireMock.mockResolvedValue(undefined as any);
    render(<DeleteQuestionnaireButton questionnaireId={99} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: /delete questionnaire/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /delete questionnaire/i }));

    await waitFor(() => expect(deleteQuestionnaireMock).toHaveBeenCalledWith(99));
    expect(push).toHaveBeenCalledWith("/staff/questionnaires");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("shows API error message from delete failure", async () => {
    deleteQuestionnaireMock.mockRejectedValue(new ApiError("Cannot delete in use template"));
    render(<DeleteQuestionnaireButton questionnaireId={22} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: /delete questionnaire/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /delete questionnaire/i }));

    await waitFor(() => expect(screen.getByText("Cannot delete in use template")).toBeInTheDocument());
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logs and shows generic delete error for unknown failures", async () => {
    const unknownError = new Error("network down");
    deleteQuestionnaireMock.mockRejectedValue(unknownError);
    render(<DeleteQuestionnaireButton questionnaireId={23} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: /delete questionnaire/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /delete questionnaire/i }));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(unknownError);
      expect(screen.getByText("Delete failed - check console")).toBeInTheDocument();
    });
  });
});
