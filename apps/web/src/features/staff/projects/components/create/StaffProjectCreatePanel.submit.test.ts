import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStaffProject } from "@/features/projects/api/client";
import { buildDefaultCreateProjectDeadlineState } from "./StaffProjectCreatePanel.create-deadlines";
import { submitCreateProject } from "./StaffProjectCreatePanel.submit";

vi.mock("@/features/projects/api/client", () => ({
  createStaffProject: vi.fn(),
}));

const createStaffProjectMock = vi.mocked(createStaffProject);

function validParams() {
  return {
    projectName: "  New Project  ",
    informationText: "  Guidance text  ",
    moduleId: "7",
    templateId: "9",
    allocationTemplateId: "",
    deadline: buildDefaultCreateProjectDeadlineState(),
    selectedStudentIds: [2, 3],
  };
}

describe("submitCreateProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createStaffProjectMock.mockResolvedValue({ id: 101, moduleId: 7, name: "New Project" } as any);
  });

  it("rejects invalid module/template identifiers", async () => {
    await expect(submitCreateProject({ ...validParams(), moduleId: "x" })).resolves.toEqual({
      ok: false,
      error: "Please choose a valid module and questionnaire template.",
    });

    await expect(submitCreateProject({ ...validParams(), templateId: "x" })).resolves.toEqual({
      ok: false,
      error: "Please choose a valid module and questionnaire template.",
    });
  });

  it("rejects invalid team allocation template identifiers", async () => {
    await expect(submitCreateProject({ ...validParams(), allocationTemplateId: "abc" })).resolves.toEqual({
      ok: false,
      error: "Team allocation questionnaire must be a valid template.",
    });
  });

  it("rejects invalid deadline state and allocation date ordering", async () => {
    const missingDeadline = { ...validParams().deadline, taskOpenDate: "" };
    await expect(submitCreateProject({ ...validParams(), deadline: missingDeadline })).resolves.toEqual({
      ok: false,
      error: "All deadline fields must be valid dates.",
    });

    const withAllocation = validParams();
    withAllocation.allocationTemplateId = "11";
    withAllocation.deadline.teamAllocationQuestionnaireOpenDate = "";
    await expect(submitCreateProject(withAllocation)).resolves.toEqual({
      ok: false,
      error: "Set both open and due dates for the team allocation questionnaire.",
    });

    const invalidOrder = validParams();
    invalidOrder.allocationTemplateId = "11";
    invalidOrder.deadline.teamAllocationQuestionnaireOpenDate = invalidOrder.deadline.teamAllocationQuestionnaireDueDate;
    await expect(submitCreateProject(invalidOrder)).resolves.toEqual({
      ok: false,
      error: "Team allocation questionnaire open date must be before the due date.",
    });

    const dueAfterTaskOpen = validParams();
    dueAfterTaskOpen.allocationTemplateId = "11";
    dueAfterTaskOpen.deadline.teamAllocationQuestionnaireOpenDate = dueAfterTaskOpen.deadline.taskOpenDate;
    dueAfterTaskOpen.deadline.teamAllocationQuestionnaireDueDate = dueAfterTaskOpen.deadline.taskDueDate;
    await expect(submitCreateProject(dueAfterTaskOpen)).resolves.toEqual({
      ok: false,
      error: "Team allocation questionnaire due date must be before project start (task open date).",
    });
  });

  it("creates projects and returns normalized success payload", async () => {
    const result = await submitCreateProject(validParams());

    expect(createStaffProjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New Project",
        moduleId: 7,
        questionnaireTemplateId: 9,
        informationText: "Guidance text",
        studentIds: [2, 3],
        teamAllocationQuestionnaireTemplateId: undefined,
      }),
    );
    expect(result).toEqual({
      ok: true,
      createdProjectId: 101,
      createdModuleId: 7,
      createdName: "New Project",
      hasAllocationTemplate: false,
    });
  });

  it("includes allocation template and null information text when blank", async () => {
    const params = validParams();
    params.informationText = "  ";
    params.allocationTemplateId = "11";

    await submitCreateProject(params);

    expect(createStaffProjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        teamAllocationQuestionnaireTemplateId: 11,
        informationText: null,
      }),
    );
  });

  it("returns friendly errors when project creation fails", async () => {
    createStaffProjectMock.mockRejectedValueOnce(new Error("API down"));
    await expect(submitCreateProject(validParams())).resolves.toEqual({ ok: false, error: "API down" });

    createStaffProjectMock.mockRejectedValueOnce("unknown");
    await expect(submitCreateProject(validParams())).resolves.toEqual({
      ok: false,
      error: "Failed to create project.",
    });
  });
});
