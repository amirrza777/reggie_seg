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

describe("EditQuestionnaireClient behavior", () => {
  const apiFetchMock = vi.mocked(apiFetch);
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    routeParams.id = "12";
    searchParamsState.value = "";
    back.mockReset();
    push.mockReset();
    apiFetchMock.mockReset();
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
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

    const body = getRequestBody("/questionnaires/12", "PUT");
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

  it("shows permission message when user cannot edit in normal mode", async () => {
    apiFetchMock.mockResolvedValueOnce({
      templateName: "Read only template",
      canEdit: false,
      isPublic: true,
      questions: [{ id: 1, label: "Q1", type: "text", configs: {} }],
    });

    render(<EditQuestionnaireClient />);

    expect(
      await screen.findByText("You do not have permission to edit this questionnaire.")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("saves as copy in copy mode and routes to questionnaires list", async () => {
    searchParamsState.value = "mode=copy";
    apiFetchMock
      .mockResolvedValueOnce({
        templateName: "Original",
        canEdit: false,
        isPublic: true,
        questions: [{ id: 2, label: "Q2", type: "text", configs: {} }],
      })
      .mockResolvedValueOnce({ ok: true, templateID: 99 });

    render(<EditQuestionnaireClient />);

    expect(await screen.findByDisplayValue("Original (Copy)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/questionnaires/new",
        expect.objectContaining({ method: "POST" })
      );
    });

    expect(push).toHaveBeenCalledWith("/staff/questionnaires");
    expect(back).not.toHaveBeenCalled();
  });

  it("updates visibility, slider helper text, and multiple-choice options in editor", async () => {
    apiFetchMock.mockResolvedValueOnce({
      templateName: "Editor",
      canEdit: true,
      isPublic: true,
      questions: [
        {
          id: 20,
          label: "Slider q",
          type: "slider",
          configs: { min: 0, max: 10, step: 1, left: "Low", right: "High", helperText: "Old help" },
        },
        {
          id: 21,
          label: "MC q",
          type: "multiple-choice",
          configs: { options: ["Yes", "No"] },
        },
      ],
    });

    render(<EditQuestionnaireClient />);

    await screen.findByDisplayValue("Editor");

    fireEvent.click(screen.getByRole("button", { name: "Private" }));

    fireEvent.change(screen.getByDisplayValue("Old help"), {
      target: { value: "New helper text" },
    });

    fireEvent.change(screen.getByDisplayValue("Yes"), {
      target: { value: "Absolutely" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add option" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/questionnaires/12",
        expect.objectContaining({ method: "PUT" })
      );
    });

    const body = getRequestBody("/questionnaires/12", "PUT");
    expect(body.isPublic).toBe(false);
    expect(body.questions.find((q: any) => q.type === "slider").configs.helperText).toBe(
      "New helper text"
    );

    const mcOptions = body.questions.find((q: any) => q.type === "multiple-choice").configs
      .options;
    expect(mcOptions).toContain("Absolutely");
    expect(mcOptions).toContain("New option");
  });

  it("adds new question types with default configs", async () => {
    apiFetchMock
      .mockResolvedValueOnce({
        templateName: "Base Template",
        canEdit: true,
        isPublic: true,
        questions: [{ id: 1, label: "Base question", type: "text", configs: {} }],
      })
      .mockResolvedValueOnce({});

    render(<EditQuestionnaireClient />);

    await screen.findByDisplayValue("Base Template");

    fireEvent.click(screen.getByRole("button", { name: "Add multiple choice" }));
    fireEvent.click(screen.getByRole("button", { name: "Add rating" }));
    fireEvent.click(screen.getByRole("button", { name: "Add slider" }));
    fireEvent.click(screen.getByRole("button", { name: "Add text" }));

    const questionInputs = screen.getAllByPlaceholderText("Enter your question");
    fireEvent.change(questionInputs[1], { target: { value: "Added MC" } });
    fireEvent.change(questionInputs[2], { target: { value: "Added Rating" } });
    fireEvent.change(questionInputs[3], { target: { value: "Added Slider" } });
    fireEvent.change(questionInputs[4], { target: { value: "Added Text" } });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/questionnaires/12",
        expect.objectContaining({ method: "PUT" })
      );
    });

    const body = getRequestBody("/questionnaires/12", "PUT");

    const addedMc = body.questions.find((q: any) => q.label === "Added MC");
    const addedRating = body.questions.find((q: any) => q.label === "Added Rating");
    const addedSlider = body.questions.find((q: any) => q.label === "Added Slider");
    const addedText = body.questions.find((q: any) => q.label === "Added Text");

    expect(addedMc).toMatchObject({
      type: "multiple-choice",
      configs: { options: ["Yes", "No"] },
    });
    expect(addedRating).toMatchObject({
      type: "rating",
      configs: { min: 1, max: 10 },
    });
    expect(addedSlider).toMatchObject({
      type: "slider",
      configs: {
        min: 0,
        max: 100,
        step: 1,
        left: "Strongly disagree",
        right: "Strongly agree",
      },
    });
    expect(addedText).toMatchObject({
      type: "text",
      configs: {},
    });
  });

});
