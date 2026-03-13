import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuestionnaireList } from "./QuestionnaireList";
import { getMyQuestionnaires, getPublicQuestionnairesFromOthers } from "../api/client";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("../api/client", () => ({
  getMyQuestionnaires: vi.fn(),
  getPublicQuestionnairesFromOthers: vi.fn(),
}));

vi.mock("./SharedQuestionnaireButtons", () => ({
  EditQuestionnaireButton: ({ questionnaireId }: { questionnaireId: number }) => (
    <button type="button">Edit {questionnaireId}</button>
  ),
  DeleteQuestionnaireButton: ({
    questionnaireId,
    onDeleted,
  }: {
    questionnaireId: number;
    onDeleted?: (id: number) => void;
  }) => (
    <button type="button" onClick={() => onDeleted?.(questionnaireId)}>
      Delete {questionnaireId}
    </button>
  ),
}));

describe("QuestionnaireList", () => {
  const getMyQuestionnairesMock = vi.mocked(getMyQuestionnaires);
  const getPublicQuestionnairesFromOthersMock = vi.mocked(getPublicQuestionnairesFromOthers);
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    push.mockReset();
    getMyQuestionnairesMock.mockReset();
    getPublicQuestionnairesFromOthersMock.mockReset();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("shows section empty-state messages when no questionnaires exist", async () => {
    getMyQuestionnairesMock.mockResolvedValue([]);
    getPublicQuestionnairesFromOthersMock.mockResolvedValue([]);

    render(<QuestionnaireList />);

    expect(screen.getByText("Loading questionnaires...")).toBeInTheDocument();
    expect(
      await screen.findByText("You do not have any questionnaire templates. Create one to view it here.")
    ).toBeInTheDocument();
    expect(screen.getByText("There are no public questionnaire templates yet.")).toBeInTheDocument();
  });

  it("renders questionnaire cards and previews selected questionnaire", async () => {
    getMyQuestionnairesMock.mockResolvedValue([
      { id: 11, templateName: "My template", createdAt: "2026-02-01T00:00:00.000Z" } as any,
    ]);
    getPublicQuestionnairesFromOthersMock.mockResolvedValue([
      { id: 22, templateName: "Public template", createdAt: "2026-02-02T00:00:00.000Z" } as any,
    ]);

    render(<QuestionnaireList />);

    expect(await screen.findByText("My template")).toBeInTheDocument();
    expect(screen.getByText("Public template")).toBeInTheDocument();

    const previewButtons = screen.getAllByRole("button", { name: "Preview" });
    fireEvent.click(previewButtons[0]);
    expect(push).toHaveBeenCalledWith("/staff/questionnaires/11");
  });

  it("removes a personal questionnaire after delete callback", async () => {
    getMyQuestionnairesMock.mockResolvedValue([
      { id: 33, templateName: "Delete me", createdAt: "2026-02-01T00:00:00.000Z" } as any,
    ]);
    getPublicQuestionnairesFromOthersMock.mockResolvedValue([]);

    render(<QuestionnaireList />);

    expect(await screen.findByText("Delete me")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete 33" }));

    await waitFor(() => {
      expect(screen.queryByText("Delete me")).not.toBeInTheDocument();
    });
  });

  it("shows load error message when API request fails", async () => {
    getMyQuestionnairesMock.mockRejectedValue(new Error("boom"));
    getPublicQuestionnairesFromOthersMock.mockResolvedValue([]);

    render(<QuestionnaireList />);

    expect(await screen.findByText("Failed to load questionnaires.")).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("locks workspace overflow while mounted and restores on unmount", async () => {
    const workspace = document.createElement("div");
    workspace.className = "app-shell__workspace";
    workspace.style.overflow = "auto";
    document.body.appendChild(workspace);

    getMyQuestionnairesMock.mockResolvedValue([]);
    getPublicQuestionnairesFromOthersMock.mockResolvedValue([]);

    const { unmount } = render(<QuestionnaireList />);
    await screen.findByText("There are no public questionnaire templates yet.");

    expect(workspace.style.overflow).toBe("hidden");

    unmount();
    expect(workspace.style.overflow).toBe("auto");
    workspace.remove();
  });

  it("scrolls to section when section buttons are clicked", async () => {
    getMyQuestionnairesMock.mockResolvedValue([
      { id: 1, templateName: "Mine", createdAt: "2026-02-01T00:00:00.000Z" } as any,
    ]);
    getPublicQuestionnairesFromOthersMock.mockResolvedValue([
      { id: 2, templateName: "Public", createdAt: "2026-02-02T00:00:00.000Z" } as any,
    ]);

    render(<QuestionnaireList />);
    await screen.findByText("Mine");

    const mySection = screen.getByRole("heading", { name: "My Questionnaires" }).closest("section") as HTMLElement;
    const panel = mySection.parentElement as HTMLElement;
    const scrollToSpy = vi.fn();

    Object.defineProperty(panel, "scrollTop", { value: 20, writable: true });
    panel.scrollTo = scrollToSpy as any;
    panel.getBoundingClientRect = vi.fn(() => ({ top: 100 } as DOMRect));
    mySection.getBoundingClientRect = vi.fn(() => ({ top: 220 } as DOMRect));

    fireEvent.click(screen.getByRole("button", { name: "My Questionnaires" }));

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 140, behavior: "smooth" });
  });
});
