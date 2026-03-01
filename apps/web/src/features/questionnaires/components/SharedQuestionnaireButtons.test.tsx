import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  let alertSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    deleteQuestionnaireMock.mockReset();
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("toggles visibility buttons", () => {
    const onChange = vi.fn();
    render(<QuestionnaireVisibilityButtons isPublic={false} onChange={onChange} />);

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
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("blocks cancel when confirmation is rejected", () => {
    confirmSpy.mockReturnValueOnce(false);
    const onCancel = vi.fn();
    render(<CancelQuestionnaireButton onCancel={onCancel} confirmWhen />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).not.toHaveBeenCalled();
  });

  it("navigates to edit page from EditQuestionnaireButton", () => {
    render(<EditQuestionnaireButton questionnaireId={44} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(push).toHaveBeenCalledWith("/staff/questionnaires/44/edit");
  });

  it("does not delete when confirmation is rejected", async () => {
    confirmSpy.mockReturnValueOnce(false);
    render(<DeleteQuestionnaireButton questionnaireId={12} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteQuestionnaireMock).not.toHaveBeenCalled());
  });

  it("calls onDeleted callback after successful delete", async () => {
    deleteQuestionnaireMock.mockResolvedValue(undefined as any);
    const onDeleted = vi.fn();
    render(<DeleteQuestionnaireButton questionnaireId={12} onDeleted={onDeleted} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteQuestionnaireMock).toHaveBeenCalledWith(12));
    expect(onDeleted).toHaveBeenCalledWith(12);
    expect(push).not.toHaveBeenCalled();
  });

  it("navigates and refreshes after successful delete without callback", async () => {
    deleteQuestionnaireMock.mockResolvedValue(undefined as any);
    render(<DeleteQuestionnaireButton questionnaireId={99} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteQuestionnaireMock).toHaveBeenCalledWith(99));
    expect(push).toHaveBeenCalledWith("/staff/questionnaires");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("shows API error message from delete failure", async () => {
    deleteQuestionnaireMock.mockRejectedValue(new ApiError("Cannot delete in use template"));
    render(<DeleteQuestionnaireButton questionnaireId={22} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Cannot delete in use template");
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logs and shows generic alert for unknown delete errors", async () => {
    const unknownError = new Error("network down");
    deleteQuestionnaireMock.mockRejectedValue(unknownError);
    render(<DeleteQuestionnaireButton questionnaireId={23} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(unknownError);
      expect(alertSpy).toHaveBeenCalledWith("Delete failed - check console");
    });
  });
});
