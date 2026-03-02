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

    const putCall = apiFetchMock.mock.calls.find(
      ([path, init]) => path === "/questionnaires/12" && init?.method === "PUT"
    );
    const [, init] = putCall as [string, { body?: BodyInit | null }];
    const body = JSON.parse(String(init?.body));

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

  it("shows slider numeric validation when min/max are not numbers", async () => {
    apiFetchMock.mockResolvedValueOnce({
      templateName: "Numeric checks",
      canEdit: true,
      isPublic: true,
      questions: [
        {
          id: 5,
          label: "Slider question",
          type: "slider",
          configs: { min: "bad", max: 10, step: 1, left: "Low", right: "High" },
        },
      ],
    });

    render(<EditQuestionnaireClient />);

    expect(
      await screen.findByText("Question 1 slider min/max must be numbers.")
    ).toBeInTheDocument();
  });

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

    const putCall = apiFetchMock.mock.calls.find(
      ([path, init]) => path === "/questionnaires/12" && init?.method === "PUT"
    );
    const [, init] = putCall as [string, { body?: BodyInit | null }];
    const body = JSON.parse(String(init?.body));

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

    const putCall = apiFetchMock.mock.calls.find(
      ([path, init]) => path === "/questionnaires/12" && init?.method === "PUT"
    );
    const [, init] = putCall as [string, { body?: BodyInit | null }];
    const body = JSON.parse(String(init?.body));

    const primary = body.questions.find((q: any) => q.label === "Primary MC");
    const secondary = body.questions.find((q: any) => q.label === "Secondary MC");

    expect(primary.configs.options).toEqual(["One", "Three"]);
    expect(secondary.configs.options).toEqual(["Red", "Blue", "Green"]);
  });
  it("duplicates in use mode, applies fallback fields, and saves as new template", async () => {
    searchParamsState.value = "mode=use";
    apiFetchMock
      .mockResolvedValueOnce({
        templateName: 123,
        canEdit: false,
        isPublic: true,
        questions: [{ id: 70, label: null, type: "text", configs: undefined }],
      })
      .mockResolvedValueOnce({ ok: true, templateID: 701 });

    render(<EditQuestionnaireClient />);

    expect(await screen.findByDisplayValue(/\(Copy\)$/)).toBeInTheDocument();

    const questionInput = screen.getByPlaceholderText("Enter your question");
    fireEvent.change(questionInput, { target: { value: "Use-mode copy question" } });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/questionnaires/new",
        expect.objectContaining({ method: "POST" })
      );
    });

    const postCall = apiFetchMock.mock.calls.find(
      ([path, init]) => path === "/questionnaires/new" && init?.method === "POST"
    );
    const [, init] = postCall as [string, { body?: BodyInit | null }];
    const body = JSON.parse(String(init?.body));

    expect(body.templateName).toBe(" (Copy)");
    expect(body.isPublic).toBe(false);
    expect(body.questions[0]).toMatchObject({
      label: "Use-mode copy question",
      type: "text",
      configs: {},
    });
    expect(push).toHaveBeenCalledWith("/staff/questionnaires");
    expect(back).not.toHaveBeenCalled();
  });

  it("renders named preview heading and slider default selected values", async () => {
    apiFetchMock.mockResolvedValueOnce({
      templateName: "Named Preview",
      canEdit: true,
      isPublic: true,
      questions: [
        {
          id: 80,
          label: "Slider with min",
          type: "slider",
          configs: { min: 5, max: 10, step: 1, left: "Low", right: "High" },
        },
        {
          id: 81,
          label: "Slider without min",
          type: "slider",
          configs: { max: 10, step: 1, left: "Low", right: "High" },
        },
      ],
    });

    render(<EditQuestionnaireClient />);

    await screen.findByDisplayValue("Named Preview");
    fireEvent.click(screen.getByRole("button", { name: "Student preview" }));

    expect(screen.getByText("Named Preview")).toBeInTheDocument();
    expect(screen.getByText("Selected: 5")).toBeInTheDocument();
    expect(screen.getByText("Selected: 0")).toBeInTheDocument();
  });

  it("handles missing multiple-choice and slider configs and keeps save disabled", async () => {
    apiFetchMock.mockResolvedValueOnce({
      templateName: "Missing configs",
      canEdit: true,
      isPublic: true,
      questions: [
        { id: 90, label: "MC missing options", type: "multiple-choice", configs: undefined },
        { id: 91, label: "Slider missing config", type: "slider", configs: undefined },
      ],
    });

    render(<EditQuestionnaireClient />);

    expect(await screen.findByDisplayValue("Missing configs")).toBeInTheDocument();
    expect(screen.getByText("Question 1 must have at least two options.")).toBeInTheDocument();
    expect(screen.queryByText("Question 1 has empty options.")).not.toBeInTheDocument();
    expect(screen.getByText("Question 2 slider min/max must be numbers.")).toBeInTheDocument();
    expect(screen.getByText("Question 2 slider step must be greater than zero.")).toBeInTheDocument();
    expect(screen.getByText("Question 2 slider labels are required.")).toBeInTheDocument();

    const saveButton = screen.getByRole("button", { name: "Save changes" });
    expect(saveButton).toBeDisabled();
    fireEvent.click(saveButton);

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
  });

  it("supports undefined multiple-choice options in preview/editor and add option fallback", async () => {
    apiFetchMock
      .mockResolvedValueOnce({
        templateName: "MC undefined options",
        canEdit: true,
        isPublic: true,
        questions: [
          {
            id: 100,
            label: "MC with undefined options",
            type: "multiple-choice",
            configs: {},
          },
        ],
      })
      .mockResolvedValueOnce({});

    render(<EditQuestionnaireClient />);

    await screen.findByDisplayValue("MC undefined options");

    fireEvent.click(screen.getByRole("button", { name: "Student preview" }));
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to editor" }));
    fireEvent.click(screen.getByRole("button", { name: "Add option" }));
    fireEvent.click(screen.getByRole("button", { name: "Add option" }));

    expect(await screen.findAllByDisplayValue("New option")).toHaveLength(2);

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

    expect(body.questions[0].configs.options).toEqual(["New option", "New option"]);
  });
  it("treats undefined multiple-choice option entries as empty", async () => {
    apiFetchMock.mockResolvedValueOnce({
      templateName: "Undefined option",
      canEdit: true,
      isPublic: true,
      questions: [
        {
          id: 110,
          label: "MC option check",
          type: "multiple-choice",
          configs: { options: [undefined, "Filled"] },
        },
      ],
    });

    render(<EditQuestionnaireClient />);

    expect(await screen.findByDisplayValue("Undefined option")).toBeInTheDocument();
    expect(screen.getByText("Question 1 has empty options.")).toBeInTheDocument();
  });

  it("runs slider validation branch when slider configs are undefined", async () => {
    apiFetchMock.mockResolvedValueOnce({
      templateName: "Undefined slider config",
      canEdit: true,
      isPublic: true,
      questions: [
        {
          id: 120,
          label: "Slider config check",
          type: "slider",
          configs: undefined,
        },
      ],
    });

    render(<EditQuestionnaireClient />);

    expect(await screen.findByDisplayValue("Undefined slider config")).toBeInTheDocument();
    expect(screen.getByText("Question 1 slider min/max must be numbers.")).toBeInTheDocument();
  });

  it("returns early in saveTemplate when invalid even if click is dispatched", async () => {
    apiFetchMock.mockResolvedValueOnce({
      templateName: "Early return",
      canEdit: true,
      isPublic: true,
      questions: [{ id: 130, label: "", type: "text", configs: {} }],
    });

    render(<EditQuestionnaireClient />);

    expect(await screen.findByDisplayValue("Early return")).toBeInTheDocument();

    const saveButton = screen.getByRole("button", { name: "Save changes" }) as HTMLButtonElement;
    expect(saveButton).toBeDisabled();

    const reactPropsKey = Object.keys(saveButton).find((k) => k.startsWith("__reactProps$"));
    const onClick = reactPropsKey
      ? (saveButton as any)[reactPropsKey].onClick
      : undefined;
    expect(typeof onClick).toBe("function");
    onClick({ preventDefault: () => undefined } as any);

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
  });
});

