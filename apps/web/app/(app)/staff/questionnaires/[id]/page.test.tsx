import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useParams, useRouter } from "next/navigation";
import { getQuestionnaireById } from "@/features/questionnaires/api/client";
import { logDevError } from "@/shared/lib/devLogger";
import QuestionnairePage from "./page";

const pushMock = vi.fn();
const useParamsMock = vi.mocked(useParams);
const useRouterMock = vi.mocked(useRouter);
const getQuestionnaireByIdMock = vi.mocked(getQuestionnaireById);
const logDevErrorMock = vi.mocked(logDevError);

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("@/features/questionnaires/api/client", () => ({
  getQuestionnaireById: vi.fn(),
}));

vi.mock("@/shared/lib/devLogger", () => ({
  logDevError: vi.fn(),
}));

vi.mock("@/shared/layout/Breadcrumbs", () => ({
  Breadcrumbs: () => <div data-testid="breadcrumbs" />,
}));

vi.mock("@/shared/ui/Placeholder", () => ({
  Placeholder: ({ title }: { title: string }) => <div data-testid="placeholder">{title}</div>,
}));

vi.mock("@/features/questionnaires/components/QuestionnaireView", () => ({
  QuestionnaireView: () => <div data-testid="questionnaire-view" />,
}));

vi.mock("@/features/questionnaires/components/SharedQuestionnaireButtons", () => ({
  EditQuestionnaireButton: ({ questionnaireId }: { questionnaireId: string }) => (
    <button type="button">Edit {questionnaireId}</button>
  ),
  DeleteQuestionnaireButton: ({ questionnaireId }: { questionnaireId: string }) => (
    <button type="button">Delete {questionnaireId}</button>
  ),
}));

describe("QuestionnairePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useParamsMock.mockReturnValue({ id: "15" } as any);
    useRouterMock.mockReturnValue({ push: pushMock } as any);
  });

  it("renders loading state before questionnaire is fetched", () => {
    getQuestionnaireByIdMock.mockReturnValue(new Promise(() => undefined) as any);

    render(<QuestionnairePage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading questionnaire")).toBeInTheDocument();
  });

  it("renders management actions when questionnaire is editable", async () => {
    getQuestionnaireByIdMock.mockResolvedValue({
      templateName: "Peer Review Form",
      canEdit: true,
      isPublic: true,
    } as any);

    render(<QuestionnairePage />);

    await waitFor(() => expect(screen.getByTestId("questionnaire-view")).toBeInTheDocument());
    expect(screen.getByTestId("placeholder")).toHaveTextContent("Questionnaire: Peer Review Form");
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete 15" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(pushMock).toHaveBeenCalledWith("/staff/questionnaires/15/edit?mode=copy");
  });

  it("shows public template copy action and handles load errors", async () => {
    getQuestionnaireByIdMock
      .mockResolvedValueOnce({
        templateName: "Public Template",
        canEdit: false,
        isPublic: true,
      } as any)
      .mockRejectedValueOnce(new Error("boom"));

    const { rerender } = render(<QuestionnairePage />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Copy Template" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Copy Template" }));
    expect(pushMock).toHaveBeenCalledWith("/staff/questionnaires/15/edit?mode=use");

    useParamsMock.mockReturnValue({ id: "16" } as any);
    rerender(<QuestionnairePage />);
    await waitFor(() => expect(screen.getByText("Failed to load questionnaire.")).toBeInTheDocument());
    expect(logDevErrorMock).toHaveBeenCalled();
  });
});
