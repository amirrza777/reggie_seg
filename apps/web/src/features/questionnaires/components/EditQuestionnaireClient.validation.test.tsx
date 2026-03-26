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

describe("EditQuestionnaireClient validation and fallback paths", () => {
  const apiFetchMock = vi.mocked(apiFetch);
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    routeParams.id = "12";
    searchParamsState.value = "";
    back.mockReset();
    push.mockReset();
    apiFetchMock.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  const getRequestBody = (path: string, method: string) => {
    const request = apiFetchMock.mock.calls.find(
      ([callPath, init]) => callPath === path && init?.method === method
    );
    expect(request).toBeDefined();
    const [, init] = request as [string, { body?: BodyInit | null }];
    return JSON.parse(String(init?.body));
  };

  it("shows inline save error when update API fails", async () => {
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
      expect(screen.getByText("network")).toBeInTheDocument();
    });
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

  it("renders preview fallback title and slider labels for empty/mixed question labels", async () => {
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
  });

  it("supports preview interactions for text, multiple-choice, rating and slider questions", async () => {
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
    const textBoxes = screen.getAllByRole("textbox");
    fireEvent.change(textBoxes[0], { target: { value: "Typed answer" } });

    fireEvent.click(screen.getByRole("radio", { name: "A" }));
    fireEvent.click(screen.getByRole("radio", { name: "4" }));

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "7" } });
    expect(screen.getByText("Selected: 7")).toBeInTheDocument();
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

    expect(await screen.findByText("Question 1 slider min/max must be numbers.")).toBeInTheDocument();
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

  it("supports undefined multiple-choice options in preview mode", async () => {
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
  });

  it("adds fallback multiple-choice options and persists them", async () => {
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

    const body = getRequestBody("/questionnaires/12", "PUT");
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

  it("duplicates in use mode and applies fallback fields", async () => {
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
  });

  it("saves duplicated use-mode template as a new questionnaire", async () => {
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

    const body = getRequestBody("/questionnaires/new", "POST");
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
});
