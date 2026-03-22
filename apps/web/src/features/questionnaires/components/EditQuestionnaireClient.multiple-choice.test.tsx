import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditQuestionnaireClient from "./EditQuestionnaireClient";
import { apiFetch } from "@/shared/api/http";

const back = vi.fn();
const push = vi.fn();
const routeParams = { id: "12" };
const searchParamsState = { value: "" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back, push }),
  useParams: () => routeParams,
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}));

vi.mock("@/shared/api/http", () => ({
  apiFetch: vi.fn(),
}));

describe("EditQuestionnaireClient multiple-choice behavior", () => {
  const apiFetchMock = vi.mocked(apiFetch);

  beforeEach(() => {
    routeParams.id = "12";
    searchParamsState.value = "";
    back.mockReset();
    push.mockReset();
    apiFetchMock.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  const getRequestBody = (path: string, method: string) => {
    const request = apiFetchMock.mock.calls.find(
      ([callPath, init]) => callPath === path && init?.method === method
    );
    expect(request).toBeDefined();
    const [, init] = request as [string, { body?: BodyInit | null }];
    return JSON.parse(String(init?.body));
  };

  const loadSingleMultipleChoiceEditor = async () => {
    apiFetchMock
      .mockResolvedValueOnce({
        templateName: "MC edit",
        canEdit: true,
        isPublic: true,
        questions: [
          {
            id: 6,
            label: "Pick one",
            type: "multiple-choice",
            configs: { options: ["Alpha", "Beta", "Gamma"] },
          },
        ],
      })
      .mockResolvedValueOnce({});

    render(<EditQuestionnaireClient />);
    await screen.findByDisplayValue("MC edit");
  };

  const loadDualMultipleChoiceEditor = async () => {
    apiFetchMock
      .mockResolvedValueOnce({
        templateName: "MC map branch",
        canEdit: true,
        isPublic: true,
        questions: [
          { id: 60, label: "Primary MC", type: "multiple-choice", configs: { options: ["One", "Two", "Three"] } },
          { id: 61, label: "Secondary MC", type: "multiple-choice", configs: { options: ["Red", "Blue", "Green"] } },
        ],
      })
      .mockResolvedValueOnce({});
    render(<EditQuestionnaireClient />);
    await screen.findByDisplayValue("MC map branch");
  };

  const removeOptionByLabel = (optionLabel: string) => {
    const optionInput = screen.getByDisplayValue(optionLabel);
    const removeButton = optionInput.parentElement?.querySelector("button");
    expect(removeButton).not.toBeNull();
    fireEvent.click(removeButton as HTMLButtonElement);
  };

  const saveChanges = () => {
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  };

  it("removes a multiple-choice option from the editor", async () => {
    await loadSingleMultipleChoiceEditor();
    removeOptionByLabel("Beta");
    expect(screen.queryByDisplayValue("Beta")).not.toBeInTheDocument();
  });

  it("saves updated options after removing a multiple-choice option", async () => {
    await loadSingleMultipleChoiceEditor();
    removeOptionByLabel("Beta");
    saveChanges();

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/questionnaires/12",
        expect.objectContaining({ method: "PUT" })
      );
    });

    const body = getRequestBody("/questionnaires/12", "PUT");
    expect(body.questions[0].configs.options).toEqual(["Alpha", "Gamma"]);
  });

  it("keeps non-target multiple-choice question unchanged when removing option", async () => {
    await loadDualMultipleChoiceEditor();
    removeOptionByLabel("Two");
    saveChanges();
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith("/questionnaires/12", expect.objectContaining({ method: "PUT" })));
    const body = getRequestBody("/questionnaires/12", "PUT");
    const primary = body.questions.find((q: any) => q.label === "Primary MC");
    expect(primary.configs.options).toEqual(["One", "Three"]);
  });

  it("preserves secondary multiple-choice options when editing a different question", async () => {
    await loadDualMultipleChoiceEditor();
    removeOptionByLabel("Two");
    saveChanges();
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith("/questionnaires/12", expect.objectContaining({ method: "PUT" })));
    const body = getRequestBody("/questionnaires/12", "PUT");
    const secondary = body.questions.find((q: any) => q.label === "Secondary MC");
    expect(secondary.configs.options).toEqual(["Red", "Blue", "Green"]);
  });
});
