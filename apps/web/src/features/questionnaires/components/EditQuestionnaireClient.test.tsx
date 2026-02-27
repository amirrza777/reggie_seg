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

describe("EditQuestionnaireClient", () => {
  const apiFetchMock = vi.mocked(apiFetch);
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  let alertSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    routeParams.id = "12";
    searchParamsState.value = "";
    back.mockReset();
    push.mockReset();
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

  it("shows validation errors for multiple-choice and slider config issues", async () => {
    apiFetchMock.mockResolvedValueOnce({
      templateName: "",
      canEdit: true,
      isPublic: true,
      questions: [
        { id: 1, label: "", type: "multiple-choice", configs: { options: [""] } },
        {
          id: 2,
          label: "Slider",
          type: "slider",
          configs: { min: 2, max: 1, step: 0, left: "", right: "" },
        },
      ],
    });

    render(<EditQuestionnaireClient />);

    expect(await screen.findByText("Questionnaire name is required.")).toBeInTheDocument();
    expect(screen.getByText("Question 1 must have label.")).toBeInTheDocument();
    expect(screen.getByText("Question 1 must have at least two options.")).toBeInTheDocument();
    expect(screen.getByText("Question 1 has empty options.")).toBeInTheDocument();
    expect(screen.getByText("Question 2 slider min must be less than max.")).toBeInTheDocument();
    expect(screen.getByText("Question 2 slider step must be greater than zero.")).toBeInTheDocument();
    expect(screen.getByText("Question 2 slider labels are required.")).toBeInTheDocument();
  });

  it("handles invalid questionnaire payload safely", async () => {
    apiFetchMock.mockResolvedValueOnce({ templateName: "Bad payload", questions: null });

    render(<EditQuestionnaireClient />);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Invalid questionnaire payload", {
        templateName: "Bad payload",
        questions: null,
      });
    });
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("handles load failure safely", async () => {
    const err = new Error("load failed");
    apiFetchMock.mockRejectedValueOnce(err);

    render(<EditQuestionnaireClient />);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(err);
    });
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders preview fallback title and preview controls for all question types", async () => {
    apiFetchMock.mockResolvedValueOnce({
      templateName: "",
      canEdit: true,
      isPublic: true,
      questions: [
        { id: 10, label: "", type: "text", configs: {} },
        { id: 11, label: "Pick one", type: "multiple-choice", configs: { options: ["A", "B"] } },
        { id: 12, label: "Rate", type: "rating", configs: { min: 1, max: 5 } },
        {
          id: 13,
          label: "Slide",
          type: "slider",
          configs: { min: 0, max: 10, step: 1, left: "Low", right: "High", helperText: "Use slider" },
        },
      ],
    });

    render(<EditQuestionnaireClient />);

    await screen.findByRole("button", { name: "Student preview" });
    fireEvent.click(screen.getByRole("button", { name: "Student preview" }));

    expect(screen.getByText("Please name your questionnaire")).toBeInTheDocument();
    expect(screen.getByText("Untitled question")).toBeInTheDocument();
    expect(screen.getByText("Use slider")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();

    const textBoxes = screen.getAllByRole("textbox");
    fireEvent.change(textBoxes[0], { target: { value: "Typed answer" } });

    fireEvent.click(screen.getByRole("radio", { name: "A" }));
    fireEvent.click(screen.getByRole("radio", { name: "4" }));

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "7" } });
    expect(screen.getByText("Selected: 7")).toBeInTheDocument();
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

    const putCall = apiFetchMock.mock.calls.find(
      ([path, init]) => path === "/questionnaires/12" && init?.method === "PUT"
    );
    const [, init] = putCall as [string, { body?: BodyInit | null }];
    const body = JSON.parse(String(init?.body));

    expect(body.isPublic).toBe(false);
    expect(body.questions.find((q: any) => q.type === "slider").configs.helperText).toBe("New helper text");
    const mcOptions = body.questions.find((q: any) => q.type === "multiple-choice").configs.options;
    expect(mcOptions).toContain("Absolutely");
    expect(mcOptions).toContain("New option");
  });
});

