import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NewQuestionnaireClient from "./NewQuestionnaireClient";
import { createQuestionnaire } from "../api/client";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

vi.mock("../api/client", () => ({
  createQuestionnaire: vi.fn(),
}));

describe("NewQuestionnaireClient", () => {
  const createQuestionnaireMock = vi.mocked(createQuestionnaire);
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    push.mockReset();
    createQuestionnaireMock.mockReset();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("shows multiple-choice validation errors for invalid options", async () => {
    render(<NewQuestionnaireClient />);

    fireEvent.change(screen.getByPlaceholderText("Questionnaire name"), {
      target: { value: "Validation" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add multiple choice" }));
    fireEvent.click(screen.getByRole("button", { name: "Add multiple choice" }));

    const labelInputs = screen.getAllByPlaceholderText("Question label");
    fireEvent.change(labelInputs[0], { target: { value: "MC with empty option" } });
    fireEvent.change(labelInputs[1], { target: { value: "MC with one option" } });

    const optionInputs = screen.getAllByDisplayValue(/Yes|No/);
    fireEvent.change(optionInputs[0], { target: { value: "" } });
    const secondQuestionNoOption = optionInputs[3];
    const removeSecondQuestionNo = secondQuestionNoOption.parentElement?.querySelector("button");
    expect(removeSecondQuestionNo).not.toBeNull();
    fireEvent.click(removeSecondQuestionNo as HTMLButtonElement);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Question 1 has empty multiple-choice options.")).toBeInTheDocument();
    expect(screen.getByText("Question 2 must have at least two options.")).toBeInTheDocument();
  });

  it("shows slider validation errors for malformed slider configs", async () => {
    vi.resetModules();
    const setState = vi.fn();
    const malformedQuestions = [
      { uiId: 1, label: "S1", type: "slider", configs: undefined },
      { uiId: 2, label: "S2", type: "slider", configs: { min: 2, max: 1, step: 0, left: "", right: "" } },
    ];
    let stateCall = 0;

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");
      return {
        ...actual,
        useState: (initial: unknown) => {
          stateCall += 1;
          if (stateCall === 1) return ["Injected template", setState] as any;
          if (stateCall === 2) return [malformedQuestions, setState] as any;
          if (stateCall === 3) return [false, setState] as any;
          if (stateCall === 4) return [false, setState] as any;
          if (stateCall === 5) return [false, setState] as any;
          if (stateCall === 6) return [false, setState] as any;
          if (stateCall === 7) return [{}, setState] as any;
          return actual.useState(initial);
        },
      };
    });
    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
    }));
    vi.doMock("../api/client", () => ({
      createQuestionnaire: vi.fn(),
    }));

    const { default: InjectedClient } = await import("./NewQuestionnaireClient");
    render(<InjectedClient />);

    expect(await screen.findByText("Question 1 slider min/max must be numbers.")).toBeInTheDocument();
    expect(screen.getByText("Question 1 slider step must be greater than zero.")).toBeInTheDocument();
    expect(screen.getByText("Question 1 slider must have left and right labels.")).toBeInTheDocument();
    expect(screen.getByText("Question 2 slider min must be less than max.")).toBeInTheDocument();
    expect(screen.getByText("Question 2 slider step must be greater than zero.")).toBeInTheDocument();
    expect(screen.getByText("Question 2 slider must have left and right labels.")).toBeInTheDocument();

  });

  it("returns early when saveTemplate is called while invalid", () => {
    render(<NewQuestionnaireClient />);

    const saveButton = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(saveButton).toBeDisabled();

    const reactPropsKey = Object.keys(saveButton).find((k) => k.startsWith("__reactProps$"));
    const onClick = reactPropsKey
      ? (saveButton as any)[reactPropsKey].onClick
      : undefined;
    expect(typeof onClick).toBe("function");
    onClick({ preventDefault: () => undefined } as any);

    expect(createQuestionnaireMock).not.toHaveBeenCalled();
  });

  it("saves successfully and resets state", async () => {
    createQuestionnaireMock.mockResolvedValueOnce({
      ok: true,
      templateID: 1,
      userId: 1,
      isPublic: false,
    });

    render(<NewQuestionnaireClient />);

    fireEvent.change(screen.getByPlaceholderText("Questionnaire name"), {
      target: { value: "Save success" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Public" }));
    fireEvent.click(screen.getByRole("button", { name: "Add text" }));
    fireEvent.change(screen.getByPlaceholderText("Question label"), {
      target: { value: "Text question" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(createQuestionnaireMock).toHaveBeenCalledWith(
        expect.objectContaining({
          templateName: "Save success",
          isPublic: true,
          questions: [
            {
              label: "Text question",
              type: "text",
              configs: {},
            },
          ],
        }),
      );
    });

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/staff/questionnaires");
      expect(screen.getByPlaceholderText("Questionnaire name")).toHaveValue("");
      expect(screen.queryByPlaceholderText("Question label")).not.toBeInTheDocument();
    });
  });

  it("shows save failure message and leaves editor usable", async () => {
    createQuestionnaireMock.mockRejectedValueOnce(new Error("fail"));

    render(<NewQuestionnaireClient />);

    fireEvent.change(screen.getByPlaceholderText("Questionnaire name"), {
      target: { value: "Save fail" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add text" }));
    fireEvent.change(screen.getByPlaceholderText("Question label"), {
      target: { value: "Question" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("fail")).toBeInTheDocument();
    });
    expect(errorSpy).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("renders and updates preview controls for all question types", async () => {
    render(<NewQuestionnaireClient />);

    fireEvent.change(screen.getByPlaceholderText("Questionnaire name"), {
      target: { value: "Preview" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add text" }));
    fireEvent.click(screen.getByRole("button", { name: "Add multiple choice" }));
    fireEvent.click(screen.getByRole("button", { name: "Add rating" }));
    fireEvent.click(screen.getByRole("button", { name: "Add slider" }));

    const labels = screen.getAllByPlaceholderText("Question label");
    fireEvent.change(labels[0], { target: { value: "Text label" } });
    fireEvent.change(labels[1], { target: { value: "MC label" } });
    fireEvent.change(labels[2], { target: { value: "Rating label" } });
    fireEvent.change(labels[3], { target: { value: "Slider label" } });

    fireEvent.click(screen.getByRole("button", { name: "Student preview" }));

    expect(screen.getByText("Text label")).toBeInTheDocument();
    expect(screen.getByText("MC label")).toBeInTheDocument();
    expect(screen.getByText("Rating label")).toBeInTheDocument();
    expect(screen.getByText("Slider label")).toBeInTheDocument();

    expect(screen.getByText(/helper text shown to students/i)).toBeInTheDocument();

    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "typed" } });

    fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
    fireEvent.click(screen.getByRole("radio", { name: "4" }));

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "42" } });

    expect(screen.getByText("Selected: 42")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to editor" }));
  });

  it("updates labels, slider helper, multiple-choice options, removes and adds options", async () => {
    createQuestionnaireMock.mockResolvedValueOnce({
      ok: true,
      templateID: 2,
      userId: 1,
      isPublic: false,
    });

    render(<NewQuestionnaireClient />);

    fireEvent.change(screen.getByPlaceholderText("Questionnaire name"), {
      target: { value: "Editor updates" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add slider" }));
    fireEvent.click(screen.getByRole("button", { name: "Add multiple choice" }));

    const labels = screen.getAllByPlaceholderText("Question label");
    fireEvent.change(labels[0], { target: { value: "Updated slider label" } });
    fireEvent.change(labels[1], { target: { value: "Updated MC label" } });

    fireEvent.change(screen.getByPlaceholderText("Helper text shown to students"), {
      target: { value: "Updated helper" },
    });

    fireEvent.change(screen.getByDisplayValue("Yes"), {
      target: { value: "Absolutely" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add option" }));

    const noInput = screen.getByDisplayValue("No");
    const removeNoOption = noInput.parentElement?.querySelector("button");
    expect(removeNoOption).not.toBeNull();
    fireEvent.click(removeNoOption as HTMLButtonElement);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(createQuestionnaireMock).toHaveBeenCalledTimes(1);
    });

    const payload = createQuestionnaireMock.mock.calls[0][0];
    const slider = payload.questions.find((q) => q.type === "slider");
    const mc = payload.questions.find((q) => q.type === "multiple-choice");

    expect(slider?.label).toBe("Updated slider label");
    expect((slider?.configs as any).helperText).toBe("Updated helper");

    expect(mc?.label).toBe("Updated MC label");
    expect((mc?.configs as any).options).toContain("Absolutely");
    expect((mc?.configs as any).options).toContain("New option");
    expect((mc?.configs as any).options).not.toContain("No");
  });

  it("covers preview fallback rendering for untitled, missing MC options, and slider min fallback", async () => {
    vi.resetModules();
    let stateCall = 0;
    const setState = vi.fn();

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");
      return {
        ...actual,
        useState: (initial: unknown) => {
          stateCall += 1;
          if (stateCall === 1) return ["Preview injected", setState] as any;
          if (stateCall === 2) {
            return [[
              { uiId: 1, label: "", type: "text", configs: {} },
              { uiId: 2, label: "MC injected", type: "multiple-choice", configs: {} },
              { uiId: 3, label: "Slider injected", type: "slider", configs: { max: 10, step: 1, left: "Low", right: "High" } },
            ], setState] as any;
          }
          if (stateCall === 3) return [true, setState] as any;
          if (stateCall === 4) return [false, setState] as any;
          if (stateCall === 5) return [false, setState] as any;
          if (stateCall === 6) return [false, setState] as any;
          if (stateCall === 7) return [{}, setState] as any;
          return actual.useState(initial);
        },
      };
    });
    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
    }));
    vi.doMock("../api/client", () => ({
      createQuestionnaire: vi.fn(),
    }));

    const { default: InjectedClient } = await import("./NewQuestionnaireClient");
    render(<InjectedClient />);

    expect(screen.getByText("Untitled question")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Yes" })).not.toBeInTheDocument();
    expect(screen.getByText("Selected: 0")).toBeInTheDocument();
  });

  it("covers editor fallback branches for missing and undefined MC options", async () => {
    vi.resetModules();
    let stateCall = 0;
    const setState = vi.fn();
    const injectedQuestions = [
      { uiId: 11, label: "MC without options", type: "multiple-choice", configs: {} },
      { uiId: 12, label: "MC with undefined option", type: "multiple-choice", configs: { options: [undefined, "X"] } },
    ];
    const setQuestions = vi.fn((updater: unknown) => {
      if (typeof updater === "function") {
        (updater as (qs: typeof injectedQuestions) => unknown)(injectedQuestions);
      }
    });

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");
      return {
        ...actual,
        useState: (initial: unknown) => {
          stateCall += 1;
          if (stateCall === 1) return ["Editor injected", setState] as any;
          if (stateCall === 2) return [injectedQuestions, setQuestions] as any;
          if (stateCall === 3) return [false, setState] as any;
          if (stateCall === 4) return [false, setState] as any;
          if (stateCall === 5) return [false, setState] as any;
          if (stateCall === 6) return [false, setState] as any;
          if (stateCall === 7) return [{}, setState] as any;
          return actual.useState(initial);
        },
      };
    });
    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
    }));
    vi.doMock("../api/client", () => ({
      createQuestionnaire: vi.fn(),
    }));

    const { default: InjectedClient } = await import("./NewQuestionnaireClient");
    render(<InjectedClient />);

    expect(await screen.findByText("Question 1 must have at least two options.")).toBeInTheDocument();
    expect(screen.getByText("Question 2 has empty multiple-choice options.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Add option" })[0]);
  });

  it("prevents text questions for customised allocation purpose", async () => {
    render(<NewQuestionnaireClient />);

    fireEvent.change(screen.getByPlaceholderText("Questionnaire name"), {
      target: { value: "Allocation only" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add text" }));
    fireEvent.change(screen.getByPlaceholderText("Question label"), {
      target: { value: "Free text prompt" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Customised Allocation" }));

    expect(screen.queryByRole("button", { name: "Add text" })).not.toBeInTheDocument();
    expect(
      screen.getByText("Question 1 cannot be text for customised allocation questionnaires.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
