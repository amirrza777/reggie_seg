import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditQuestionnaireClient from "./EditQuestionnaireClient";
import { apiFetch } from "@/shared/api/http";

const back = vi.fn();
const routeParams = { id: "12" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back }),
  useParams: () => routeParams,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/shared/api/http", () => ({
  apiFetch: vi.fn(),
}));

describe("EditQuestionnaireClient", () => {
  const apiFetchMock = vi.mocked(apiFetch);
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  let alertSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    routeParams.id = "12";
    back.mockReset();
    apiFetchMock.mockReset();
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("renders invalid ID state and does not request data for non-numeric id", () => {
    routeParams.id = "not-a-number";
    render(<EditQuestionnaireClient />);

    expect(screen.getByText("Invalid questionnaire ID")).toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("loads questionnaire data into editor fields", async () => {
    apiFetchMock.mockResolvedValueOnce({
      templateName: "Module Retrospective",
      questions: [{ id: 1, label: "What worked well?", type: "text", configs: {} }],
    });

    render(<EditQuestionnaireClient />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Module Retrospective")).toBeInTheDocument();
    expect(screen.getByDisplayValue("What worked well?")).toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalledWith("/questionnaires/12");
  });

  it("saves edits and navigates back", async () => {
    apiFetchMock
      .mockResolvedValueOnce({
        templateName: "Weekly Check-in",
        questions: [{ id: 42, label: "Original question", type: "text", configs: {} }],
      })
      .mockResolvedValueOnce({});

    render(<EditQuestionnaireClient />);

    await screen.findByDisplayValue("Weekly Check-in");
    fireEvent.change(screen.getByDisplayValue("Weekly Check-in"), {
      target: { value: "Updated Weekly Check-in" },
    });
    fireEvent.change(screen.getByDisplayValue("Original question"), {
      target: { value: "Updated question text" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/questionnaires/12",
        expect.objectContaining({ method: "PUT" })
      );
    });

    const putCall = apiFetchMock.mock.calls.find(([path, init]) => path === "/questionnaires/12" && init?.method === "PUT");
    expect(putCall).toBeDefined();

    const [, init] = putCall as [string, { body?: BodyInit | null }];
    const body = JSON.parse(String(init?.body));
    expect(body.templateName).toBe("Updated Weekly Check-in");
    expect(Array.isArray(body.questions)).toBe(true);
    expect(body.questions[0]).toMatchObject({
      label: "Updated question text",
      type: "text",
    });

    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
  });

  it("asks for confirmation on cancel when there are unsaved changes", async () => {
    apiFetchMock.mockResolvedValueOnce({
      templateName: "Project Feedback",
      questions: [{ id: 7, label: "Q1", type: "text", configs: {} }],
    });

    render(<EditQuestionnaireClient />);

    await screen.findByDisplayValue("Project Feedback");
    fireEvent.change(screen.getByDisplayValue("Project Feedback"), {
      target: { value: "Project Feedback Updated" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "You have unsaved changes. Are you sure you want to exit without saving?"
    );
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("stays on page when cancel confirmation is rejected", async () => {
    confirmSpy.mockReturnValueOnce(false);
    apiFetchMock.mockResolvedValueOnce({
      templateName: "Team Pulse",
      questions: [{ id: 3, label: "Q", type: "text", configs: {} }],
    });

    render(<EditQuestionnaireClient />);

    await screen.findByDisplayValue("Team Pulse");
    fireEvent.change(screen.getByDisplayValue("Team Pulse"), {
      target: { value: "Team Pulse v2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(back).not.toHaveBeenCalled();
  });

  it("shows alert when update API fails", async () => {
    apiFetchMock
      .mockResolvedValueOnce({
        templateName: "Health Survey",
        questions: [{ id: 8, label: "How are things?", type: "text", configs: {} }],
      })
      .mockRejectedValueOnce(new Error("network"));

    render(<EditQuestionnaireClient />);
    await screen.findByDisplayValue("Health Survey");

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Save failed — check console");
    });
    expect(back).not.toHaveBeenCalled();
  });
});
