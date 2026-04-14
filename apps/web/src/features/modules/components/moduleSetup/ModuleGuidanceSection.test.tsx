import { fireEvent, render, screen } from "@testing-library/react";
import type { FormEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EnterpriseModuleAccessSelectionResponse } from "@/features/enterprise/types";
import { ModuleGuidanceSection } from "./ModuleGuidanceSection";

vi.mock("@/features/enterprise/components/useEnterpriseModuleCreateFormState", () => ({
  useEnterpriseModuleCreateFormState: vi.fn(),
}));

import { useEnterpriseModuleCreateFormState } from "@/features/enterprise/components/useEnterpriseModuleCreateFormState";

const useEnterpriseModuleCreateFormStateMock = vi.mocked(useEnterpriseModuleCreateFormState);

function makeAccessSelection(
  overrides: Partial<EnterpriseModuleAccessSelectionResponse> = {}
): EnterpriseModuleAccessSelectionResponse {
  return {
    module: {
      id: 12,
      name: "Module from API",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
      studentCount: 10,
      leaderCount: 1,
      teachingAssistantCount: 2,
      briefText: "API brief",
      timelineText: "API timeline",
      expectationsText: "API expectations",
      readinessNotesText: "API readiness",
    },
    leaderIds: [2],
    taIds: [3],
    studentIds: [4, 5],
    ...overrides,
  };
}

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    isLoadingAccess: false,
    canEditModule: true,
    errorMessage: null,
    handleSubmit: vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault()),
    navigateHome: vi.fn(),
    isSubmitting: false,
    moduleName: "SE Foundations",
    moduleNameError: null,
    handleModuleNameChange: vi.fn(),
    isEditMode: false,
    briefText: "Brief",
    timelineText: "Timeline",
    expectationsText: "Expectations",
    readinessNotesText: "Readiness",
    setBriefText: vi.fn(),
    setTimelineText: vi.fn(),
    setExpectationsText: vi.fn(),
    setReadinessNotesText: vi.fn(),
    applyGuidanceDefaults: vi.fn(),
    ...overrides,
  } as any;
}

describe("ModuleGuidanceSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders embedded create mode and applies defaults only once for identical signatures", () => {
    const state = makeState({ isEditMode: false });
    const defaults = {
      moduleName: "SE A",
      briefText: "Brief A",
      timelineText: "Timeline A",
      expectationsText: "Expectations A",
      readinessNotesText: "Readiness A",
    };

    const { rerender } = render(<ModuleGuidanceSection state={state} defaultGuidance={defaults} />);

    expect(state.applyGuidanceDefaults).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/you can define module brief/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Module brief")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Module name"), { target: { value: "New name" } });
    expect(state.handleModuleNameChange).toHaveBeenCalledWith("New name");

    rerender(
      <ModuleGuidanceSection
        state={state}
        defaultGuidance={{
          moduleName: "SE A",
          briefText: "Brief A",
          timelineText: "Timeline A",
          expectationsText: "Expectations A",
          readinessNotesText: "Readiness A",
        }}
      />
    );

    expect(state.applyGuidanceDefaults).toHaveBeenCalledTimes(1);
  });

  it("renders embedded edit mode guidance text fields and field updaters", () => {
    const state = makeState({ isEditMode: true });

    render(<ModuleGuidanceSection state={state} guidanceFieldsKey="k1" />);

    fireEvent.change(screen.getByLabelText("Module brief"), { target: { value: "B2" } });
    fireEvent.change(screen.getByLabelText("Timeline"), { target: { value: "T2" } });
    fireEvent.change(screen.getByLabelText("Module expectations"), { target: { value: "E2" } });
    fireEvent.change(screen.getByLabelText("Readiness notes"), { target: { value: "R2" } });

    expect(state.setBriefText).toHaveBeenCalledWith("B2");
    expect(state.setTimelineText).toHaveBeenCalledWith("T2");
    expect(state.setExpectationsText).toHaveBeenCalledWith("E2");
    expect(state.setReadinessNotesText).toHaveBeenCalledWith("R2");
  });

  it("renders staff-manage loading and permission states", () => {
    const selection = makeAccessSelection();
    useEnterpriseModuleCreateFormStateMock.mockReturnValueOnce(makeState({ isLoadingAccess: true }));

    const { rerender } = render(
      <ModuleGuidanceSection moduleId={selection.module.id} initialAccessSelection={selection} />
    );

    expect(screen.getByText("Loading module…")).toBeInTheDocument();

    useEnterpriseModuleCreateFormStateMock.mockReturnValueOnce(
      makeState({
        isLoadingAccess: false,
        canEditModule: false,
        errorMessage: "Custom forbidden message.",
      })
    );

    rerender(<ModuleGuidanceSection moduleId={selection.module.id} initialAccessSelection={selection} />);
    expect(screen.getByText("Custom forbidden message.")).toBeInTheDocument();
  });

  it("shows default standalone permission message when API does not provide one", () => {
    const selection = makeAccessSelection();
    useEnterpriseModuleCreateFormStateMock.mockReturnValueOnce(
      makeState({
        isLoadingAccess: false,
        canEditModule: false,
        errorMessage: null,
      })
    );
    render(<ModuleGuidanceSection moduleId={selection.module.id} initialAccessSelection={selection} />);
    expect(screen.getByText("Only module owners/leaders can edit this module.")).toBeInTheDocument();
  });

  it("renders staff-manage form, merges defaults with staff row, and wires actions", () => {
    const selection = makeAccessSelection({
      module: {
        ...makeAccessSelection().module,
        name: "",
        briefText: "",
        timelineText: "",
        expectationsText: "",
        readinessNotesText: "",
      },
    });
    const state = makeState({
      isEditMode: true,
      errorMessage: "Save failed.",
      isSubmitting: false,
    });
    useEnterpriseModuleCreateFormStateMock.mockReturnValue(state);

    render(
      <ModuleGuidanceSection
        moduleId={selection.module.id}
        initialAccessSelection={selection}
        staffModuleRow={{
          title: "Fallback module title",
          briefText: "Fallback brief",
          timelineText: "Fallback timeline",
          expectationsText: "Fallback expectations",
          readinessNotesText: "Fallback readiness",
        }}
      />
    );

    expect(useEnterpriseModuleCreateFormStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "edit",
        moduleId: selection.module.id,
        workspace: "staff",
      }),
    );

    expect(state.applyGuidanceDefaults).toHaveBeenCalledWith({
      moduleName: "Fallback module title",
      briefText: "Fallback brief",
      timelineText: "Fallback timeline",
      expectationsText: "Fallback expectations",
      readinessNotesText: "Fallback readiness",
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(state.navigateHome).toHaveBeenCalledTimes(1);

    fireEvent.submit(screen.getByRole("button", { name: "Save changes" }).closest("form") as HTMLFormElement);
    expect(state.handleSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Save failed.")).toBeInTheDocument();
  });

  it("shows submitting state for staff-manage save action", () => {
    const selection = makeAccessSelection();
    const state = makeState({ isEditMode: true, isSubmitting: true });
    useEnterpriseModuleCreateFormStateMock.mockReturnValue(state);

    render(<ModuleGuidanceSection moduleId={selection.module.id} initialAccessSelection={selection} />);

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("marks module name invalid and shows field error text", () => {
    const state = makeState({
      moduleName: "",
      moduleNameError: "Module name is required",
      isEditMode: false,
    });
    render(<ModuleGuidanceSection state={state} />);
    expect(screen.getByLabelText("Module name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Module name is required")).toBeInTheDocument();
  });
});
