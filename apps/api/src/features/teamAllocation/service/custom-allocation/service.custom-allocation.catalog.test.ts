import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertProjectMutableForWrites: vi.fn(),
  repo: {
    findCustomAllocationQuestionnairesForStaff: vi.fn(),
    findCustomAllocationTemplateForStaff: vi.fn(),
    findRespondingStudentIdsForTemplateInProject: vi.fn(),
    findStaffScopedProject: vi.fn(),
    findVacantModuleStudentsForProject: vi.fn(),
  },
}));

vi.mock("../../../../shared/projectWriteGuard.js", () => ({
  assertProjectMutableForWrites: mocks.assertProjectMutableForWrites,
}));

vi.mock("../../repo/repo.js", () => ({
  findCustomAllocationQuestionnairesForStaff: mocks.repo.findCustomAllocationQuestionnairesForStaff,
  findCustomAllocationTemplateForStaff: mocks.repo.findCustomAllocationTemplateForStaff,
  findRespondingStudentIdsForTemplateInProject: mocks.repo.findRespondingStudentIdsForTemplateInProject,
  findStaffScopedProject: mocks.repo.findStaffScopedProject,
  findVacantModuleStudentsForProject: mocks.repo.findVacantModuleStudentsForProject,
}));

import {
  getCustomAllocationCoverageForProject,
  listCustomAllocationQuestionnairesForProject,
} from "./service.custom-allocation.catalog.js";

const baseProject = {
  id: 9,
  name: "Project",
  enterpriseId: "ent-1",
  moduleId: 3,
  moduleName: "Module",
};

describe("service.custom-allocation.catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.repo.findStaffScopedProject.mockResolvedValue(baseProject);
    mocks.repo.findCustomAllocationQuestionnairesForStaff.mockResolvedValue([]);
    mocks.repo.findCustomAllocationTemplateForStaff.mockResolvedValue({ id: 5 });
    mocks.repo.findVacantModuleStudentsForProject.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    mocks.repo.findRespondingStudentIdsForTemplateInProject.mockResolvedValue([10, 10]);
    process.env.CUSTOM_ALLOCATION_RESPONSE_THRESHOLD = "77";
  });

  it("list rejects inaccessible projects", async () => {
    mocks.repo.findStaffScopedProject.mockResolvedValue(null);
    await expect(listCustomAllocationQuestionnairesForProject(1, 9)).rejects.toEqual({
      code: "PROJECT_NOT_FOUND_OR_FORBIDDEN",
    });
  });

  it("list returns only templates with eligible question types", async () => {
    mocks.repo.findCustomAllocationQuestionnairesForStaff.mockResolvedValue([
      {
        id: 1,
        templateName: "A",
        ownerId: 2,
        isPublic: false,
        questions: [
          { id: 7, label: "Rate", type: "rating" },
          { id: 8, label: "Skip", type: "text" },
        ],
      },
      { id: 2, templateName: "B", ownerId: 2, isPublic: true, questions: [{ id: 9, label: "No", type: "text" }] },
    ]);
    const result = await listCustomAllocationQuestionnairesForProject(1, 9);
    expect(result.questionnaires).toEqual([
      {
        id: 1,
        templateName: "A",
        ownerId: 2,
        isPublic: false,
        eligibleQuestionCount: 1,
        eligibleQuestions: [{ id: 7, label: "Rate", type: "rating" }],
      },
    ]);
  });

  it.each([0, -1, 2.5])("coverage rejects invalid template id %p", async (templateId) => {
    await expect(getCustomAllocationCoverageForProject(1, 2, templateId)).rejects.toMatchObject({
      code: "INVALID_TEMPLATE_ID",
    });
  });

  it("coverage rejects missing project and template", async () => {
    mocks.repo.findStaffScopedProject.mockResolvedValue(null);
    await expect(getCustomAllocationCoverageForProject(1, 9, 5)).rejects.toEqual({
      code: "PROJECT_NOT_FOUND_OR_FORBIDDEN",
    });
    mocks.repo.findStaffScopedProject.mockResolvedValue(baseProject);
    mocks.repo.findCustomAllocationTemplateForStaff.mockResolvedValue(null);
    await expect(getCustomAllocationCoverageForProject(1, 9, 5)).rejects.toEqual({
      code: "TEMPLATE_NOT_FOUND_OR_FORBIDDEN",
    });
  });

  it("coverage computes response stats using unique respondents", async () => {
    const result = await getCustomAllocationCoverageForProject(1, 9, 5);
    expect(result.respondingStudents).toBe(1);
    expect(result.nonRespondingStudents).toBe(1);
    expect(result.responseRate).toBe(50);
    expect(result.responseThreshold).toBe(77);
  });

  it("coverage handles empty available student pools", async () => {
    mocks.repo.findVacantModuleStudentsForProject.mockResolvedValue([]);
    const result = await getCustomAllocationCoverageForProject(1, 9, 5);
    expect(result.totalAvailableStudents).toBe(0);
    expect(result.responseRate).toBe(0);
    expect(mocks.repo.findRespondingStudentIdsForTemplateInProject).not.toHaveBeenCalled();
  });
});