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

  it("removes a multiple-choice option and saves updated options", async () => {
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

    const betaInput = screen.getByDisplayValue("Beta");
    const optionRow = betaInput.parentElement;
    const removeButton = optionRow?.querySelector("button");
    expect(removeButton).not.toBeNull();
    fireEvent.click(removeButton as HTMLButtonElement);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

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
    apiFetchMock
      .mockResolvedValueOnce({
        templateName: "MC map branch",
        canEdit: true,
        isPublic: true,
        questions: [
          {
            id: 60,
            label: "Primary MC",
            type: "multiple-choice",
            configs: { options: ["One", "Two", "Three"] },
          },
          {
            id: 61,
            label: "Secondary MC",
            type: "multiple-choice",
            configs: { options: ["Red", "Blue", "Green"] },
          },
        ],
      })
      .mockResolvedValueOnce({});

    render(<EditQuestionnaireClient />);

    await screen.findByDisplayValue("MC map branch");

    const twoInput = screen.getByDisplayValue("Two");
    const optionRow = twoInput.parentElement;
    const removeButton = optionRow?.querySelector("button");
    expect(removeButton).not.toBeNull();
    fireEvent.click(removeButton as HTMLButtonElement);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/questionnaires/12",
        expect.objectContaining({ method: "PUT" })
      );
    });

    const body = getRequestBody("/questionnaires/12", "PUT");
    const primary = body.questions.find((q: any) => q.label === "Primary MC");
    const secondary = body.questions.find((q: any) => q.label === "Secondary MC");

    expect(primary.configs.options).toEqual(["One", "Three"]);
    expect(secondary.configs.options).toEqual(["Red", "Blue", "Green"]);
  });
});
