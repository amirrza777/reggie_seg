import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffProjectCreatePanel } from "./StaffProjectCreatePanel";
import { useStaffProjectCreatePanel } from "./useStaffProjectCreatePanel";

vi.mock("./useStaffProjectCreatePanel", () => ({
  useStaffProjectCreatePanel: vi.fn(),
}));

vi.mock("./StaffProjectCreatePanel.deadline-form", () => ({
  StaffProjectCreatePanelDeadlineForm: () => <div data-testid="deadline-form" />,
}));

vi.mock("./StaffProjectCreatePanel.student-picker", () => ({
  StaffProjectCreatePanelStudentPicker: () => <div data-testid="student-picker" />,
}));

const useStaffProjectCreatePanelMock = vi.mocked(useStaffProjectCreatePanel);

function buildHookState(overrides: Record<string, unknown> = {}) {
  return {
    isLoadingTemplates: false,
    templatesError: null,
    isLoadingAllocationTemplates: false,
    allocationTemplatesError: null,
    projectName: "",
    setProjectName: vi.fn(),
    informationText: "",
    setInformationText: vi.fn(),
    templateId: "",
    setTemplateId: vi.fn(),
    setSelectedTemplateOption: vi.fn(),
    allocationTemplateId: "",
    setAllocationTemplateId: vi.fn(),
    setSelectedAllocationTemplateOption: vi.fn(),
    deadline: {
      taskOpenDate: "2026-01-01T09:00",
      taskDueDate: "2026-01-10T09:00",
      taskDueDateMcf: "2026-01-17T09:00",
      assessmentOpenDate: "2026-01-11T09:00",
      assessmentDueDate: "2026-01-15T09:00",
      assessmentDueDateMcf: "2026-01-22T09:00",
      feedbackOpenDate: "2026-01-16T09:00",
      feedbackDueDate: "2026-01-20T09:00",
      feedbackDueDateMcf: "2026-01-27T09:00",
      teamAllocationQuestionnaireOpenDate: "2025-12-24T09:00",
      teamAllocationQuestionnaireDueDate: "2025-12-31T09:00",
    },
    setDeadline: vi.fn(),
    deadlinePresetStatus: null,
    deadlinePresetError: null,
    submitError: null,
    submitSuccess: null,
    isSubmitting: false,
    isLoadingModuleStudents: false,
    moduleStudentsError: null,
    studentSearchInput: "",
    selectedStudentIds: [],
    creatableModulesFromProps: [{ id: "42", title: "Module 42" }],
    hasCreatableModule: true,
    hasTemplates: true,
    hasAllocationTemplates: true,
    hasSelectedAllocationTemplate: false,
    selectedModule: { id: "42", title: "Module 42" },
    hasModuleSelection: true,
    visibleTemplates: [{ id: 11, templateName: "Peer Template" }],
    visibleAllocationTemplates: [{ id: 22, templateName: "Allocation Template" }],
    enrolledModuleStudents: [],
    filteredModuleStudents: [],
    canSubmit: true,
    deadlinePreview: {
      taskOpenDate: null,
      taskDueDate: null,
      taskDueDateMcf: null,
      assessmentOpenDate: null,
      assessmentDueDate: null,
      assessmentDueDateMcf: null,
      feedbackOpenDate: null,
      feedbackDueDate: null,
      feedbackDueDateMcf: null,
      totalDays: null,
    },
    applyMcfOffsetDays: vi.fn(),
    applySchedulePreset: vi.fn(),
    resetSchedulePreset: vi.fn(),
    selectAllModuleStudents: vi.fn(),
    clearSelectedModuleStudents: vi.fn(),
    toggleStudentSelection: vi.fn(),
    handleStudentSearchChange: vi.fn(),
    refreshModuleStudents: vi.fn(),
    onSubmit: vi.fn((event: { preventDefault: () => void }) => event.preventDefault()),
    ...overrides,
  };
}

describe("StaffProjectCreatePanel (view branches)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders singular/plural module badges and default helper links", () => {
    useStaffProjectCreatePanelMock.mockReturnValue(buildHookState({
      creatableModulesFromProps: [{ id: "42", title: "One module" }],
      hasCreatableModule: false,
      hasTemplates: false,
      hasAllocationTemplates: false,
      templatesError: null,
      allocationTemplatesError: null,
      isLoadingTemplates: false,
      isLoadingAllocationTemplates: false,
      visibleTemplates: [],
      visibleAllocationTemplates: [],
    }) as never);

    const { rerender } = render(
      <StaffProjectCreatePanel modules={[]} modulesError={null} initialModuleId={null} />,
    );

    expect(screen.getByText("1 creatable module")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Create questionnaire/i })).toHaveLength(2);
    expect(screen.getByText(/You need module-lead access to create projects/i)).toBeInTheDocument();
    expect(screen.getByText(/You do not have any peer-assessment questionnaires yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No team allocation questionnaires found yet/i)).toBeInTheDocument();

    useStaffProjectCreatePanelMock.mockReturnValue(buildHookState({
      creatableModulesFromProps: [{ id: "1", title: "A" }, { id: "2", title: "B" }],
    }) as never);

    rerender(<StaffProjectCreatePanel modules={[]} modulesError={null} initialModuleId={null} />);
    expect(screen.getByText("2 creatable modules")).toBeInTheDocument();
  });

  it("updates template/allocation selection and only sets option when a match exists", () => {
    const hookState = buildHookState({
      visibleTemplates: [{ id: 11, templateName: "Peer Template" }],
      visibleAllocationTemplates: [{ id: 22, templateName: "Allocation Template" }],
    });
    useStaffProjectCreatePanelMock.mockReturnValue(hookState as never);

    render(<StaffProjectCreatePanel modules={[]} modulesError={null} initialModuleId={null} />);

    const [templateSelect, allocationSelect] = screen.getAllByRole("combobox");

    fireEvent.change(templateSelect, { target: { value: "11" } });
    fireEvent.change(templateSelect, { target: { value: "404" } });
    fireEvent.change(allocationSelect, { target: { value: "22" } });
    fireEvent.change(allocationSelect, { target: { value: "999" } });

    expect(hookState.setTemplateId).toHaveBeenCalledWith("11");
    expect(hookState.setTemplateId).toHaveBeenCalledWith("");
    expect(hookState.setSelectedTemplateOption).toHaveBeenCalledTimes(1);
    expect(hookState.setSelectedTemplateOption).toHaveBeenCalledWith(
      expect.objectContaining({ id: 11 }),
    );

    expect(hookState.setAllocationTemplateId).toHaveBeenCalledWith("22");
    expect(hookState.setAllocationTemplateId).toHaveBeenCalledWith("");
    expect(hookState.setSelectedAllocationTemplateOption).toHaveBeenCalledTimes(1);
    expect(hookState.setSelectedAllocationTemplateOption).toHaveBeenCalledWith(
      expect.objectContaining({ id: 22 }),
    );
  });

  it("switches project students section between warning and picker", () => {
    useStaffProjectCreatePanelMock.mockReturnValue(buildHookState({ hasModuleSelection: false }) as never);

    const { rerender } = render(
      <StaffProjectCreatePanel modules={[]} modulesError={null} initialModuleId={null} />,
    );

    expect(screen.getByText(/No valid module context is available/i)).toBeInTheDocument();
    expect(screen.queryByTestId("student-picker")).not.toBeInTheDocument();

    useStaffProjectCreatePanelMock.mockReturnValue(buildHookState({ hasModuleSelection: true }) as never);
    rerender(<StaffProjectCreatePanel modules={[]} modulesError={null} initialModuleId={null} />);
    expect(screen.getByTestId("student-picker")).toBeInTheDocument();
  });

  it("renders error and submit status banners", () => {
    useStaffProjectCreatePanelMock.mockReturnValue(buildHookState({
      templatesError: "Template load failed",
      allocationTemplatesError: "Allocation load failed",
      submitError: "Submit failed",
      submitSuccess: "Created successfully",
    }) as never);

    render(<StaffProjectCreatePanel modules={[]} modulesError="Module load failed" initialModuleId={null} />);

    expect(screen.getByText("Module load failed")).toBeInTheDocument();
    expect(screen.getByText("Template load failed")).toBeInTheDocument();
    expect(screen.getByText("Allocation load failed")).toBeInTheDocument();
    expect(screen.getByText("Submit failed")).toBeInTheDocument();
    expect(screen.getByText("Created successfully")).toBeInTheDocument();
  });
});
