import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCustomAllocationCoverageForProject,
  listCustomAllocationQuestionnairesForProject,
} from "./service.js";
import * as repo from "./repo.js";
import { prisma } from "../../shared/db.js";

vi.mock("./repo.js", () => ({
  applyManualAllocationTeam: vi.fn(),
  applyRandomAllocationPlan: vi.fn(),
  createTeamInviteRecord: vi.fn(),
  findCustomAllocationQuestionnairesForStaff: vi.fn(),
  findCustomAllocationTemplateForStaff: vi.fn(),
  findActiveInvite: vi.fn(),
  findInviteContext: vi.fn(),
  findModuleStudentsForManualAllocation: vi.fn(),
  findVacantModuleStudentsForProject: vi.fn(),
  findProjectTeamSummaries: vi.fn(),
  findRespondingStudentIdsForTemplateInProject: vi.fn(),
  findStaffScopedProject: vi.fn(),
  getInvitesForTeam: vi.fn(),
  updateInviteStatusFromPending: vi.fn(),
  TeamService: {
    createTeam: vi.fn(),
    getTeamById: vi.fn(),
    addUserToTeam: vi.fn(),
    getTeamMembers: vi.fn(),
  },
}));

vi.mock("../../shared/email.js", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("../notifications/service.js", () => ({
  addNotification: vi.fn(),
}));

vi.mock("../../shared/db.js", () => ({
  prisma: {
    team: {
      findUnique: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe("teamAllocation service custom allocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.team.findUnique as any).mockResolvedValue(null);
  });

  it("listCustomAllocationQuestionnairesForProject enforces staff scope and archived guard", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValueOnce(null);
    await expect(listCustomAllocationQuestionnairesForProject(3, 9)).rejects.toEqual({
      code: "PROJECT_NOT_FOUND_OR_FORBIDDEN",
    });

    (repo.findStaffScopedProject as any).mockResolvedValueOnce({
      id: 9,
      name: "Project",
      moduleId: 2,
      moduleName: "Module",
      archivedAt: new Date(),
      enterpriseId: "ent-1",
    });
    await expect(listCustomAllocationQuestionnairesForProject(3, 9)).rejects.toEqual({
      code: "PROJECT_ARCHIVED",
    });
  });

  it("listCustomAllocationQuestionnairesForProject returns only eligible questionnaires", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
    });
    (repo.findCustomAllocationQuestionnairesForStaff as any).mockResolvedValue([
      {
        id: 1,
        templateName: "Text Only",
        ownerId: 7,
        isPublic: false,
        questions: [{ id: 101, label: "Notes", type: "text" }],
      },
      {
        id: 2,
        templateName: "Team Setup",
        ownerId: 7,
        isPublic: false,
        questions: [
          { id: 201, label: "Skill level", type: "multiple_choice" },
          { id: 202, label: "Timezone match", type: "rating" },
        ],
      },
      {
        id: 3,
        templateName: "Preferences",
        ownerId: 9,
        isPublic: true,
        questions: [{ id: 301, label: "Working pace", type: "slider" }],
      },
    ]);

    const result = await listCustomAllocationQuestionnairesForProject(7, 42);

    expect(repo.findCustomAllocationQuestionnairesForStaff).toHaveBeenCalledWith(7);
    expect(result).toEqual({
      project: {
        id: 42,
        name: "Project A",
        moduleId: 11,
        moduleName: "Module A",
      },
      questionnaires: [
        {
          id: 2,
          templateName: "Team Setup",
          ownerId: 7,
          isPublic: false,
          eligibleQuestionCount: 2,
          eligibleQuestions: [
            { id: 201, label: "Skill level", type: "multiple-choice" },
            { id: 202, label: "Timezone match", type: "rating" },
          ],
        },
        {
          id: 3,
          templateName: "Preferences",
          ownerId: 9,
          isPublic: true,
          eligibleQuestionCount: 1,
          eligibleQuestions: [{ id: 301, label: "Working pace", type: "slider" }],
        },
      ],
    });
  });

  it("getCustomAllocationCoverageForProject validates template id and project scope", async () => {
    await expect(getCustomAllocationCoverageForProject(7, 42, 0)).rejects.toEqual({
      code: "INVALID_TEMPLATE_ID",
    });

    (repo.findStaffScopedProject as any).mockResolvedValueOnce(null);
    await expect(getCustomAllocationCoverageForProject(7, 42, 5)).rejects.toEqual({
      code: "PROJECT_NOT_FOUND_OR_FORBIDDEN",
    });

    (repo.findStaffScopedProject as any).mockResolvedValueOnce({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: new Date(),
      enterpriseId: "ent-9",
    });
    await expect(getCustomAllocationCoverageForProject(7, 42, 5)).rejects.toEqual({
      code: "PROJECT_ARCHIVED",
    });
  });

  it("getCustomAllocationCoverageForProject validates template access", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
    });
    (repo.findCustomAllocationTemplateForStaff as any).mockResolvedValue(null);

    await expect(getCustomAllocationCoverageForProject(7, 42, 5)).rejects.toEqual({
      code: "TEMPLATE_NOT_FOUND_OR_FORBIDDEN",
    });
  });

  it("getCustomAllocationCoverageForProject returns coverage for available students", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
    });
    (repo.findCustomAllocationTemplateForStaff as any).mockResolvedValue({
      id: 5,
      templateName: "Team Setup",
      ownerId: 7,
      isPublic: false,
      questions: [{ id: 12, label: "Skill level", type: "rating" }],
    });
    (repo.findVacantModuleStudentsForProject as any).mockResolvedValue([
      { id: 1, firstName: "A", lastName: "A", email: "a@example.com" },
      { id: 2, firstName: "B", lastName: "B", email: "b@example.com" },
      { id: 3, firstName: "C", lastName: "C", email: "c@example.com" },
      { id: 4, firstName: "D", lastName: "D", email: "d@example.com" },
    ]);
    (repo.findRespondingStudentIdsForTemplateInProject as any).mockResolvedValue([2, 4, 2]);

    const result = await getCustomAllocationCoverageForProject(7, 42, 5);

    expect(repo.findVacantModuleStudentsForProject).toHaveBeenCalledWith("ent-9", 11, 42);
    expect(repo.findRespondingStudentIdsForTemplateInProject).toHaveBeenCalledWith(42, 5, [1, 2, 3, 4]);
    expect(result).toEqual({
      project: {
        id: 42,
        name: "Project A",
        moduleId: 11,
        moduleName: "Module A",
      },
      questionnaireTemplateId: 5,
      totalAvailableStudents: 4,
      respondingStudents: 2,
      nonRespondingStudents: 2,
      responseRate: 50,
      responseThreshold: 80,
    });
  });

  it("getCustomAllocationCoverageForProject handles zero available students", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
    });
    (repo.findCustomAllocationTemplateForStaff as any).mockResolvedValue({
      id: 5,
      templateName: "Team Setup",
      ownerId: 7,
      isPublic: false,
      questions: [{ id: 12, label: "Skill level", type: "rating" }],
    });
    (repo.findVacantModuleStudentsForProject as any).mockResolvedValue([]);

    const result = await getCustomAllocationCoverageForProject(7, 42, 5);

    expect(repo.findRespondingStudentIdsForTemplateInProject).not.toHaveBeenCalled();
    expect(result.responseRate).toBe(0);
    expect(result.respondingStudents).toBe(0);
    expect(result.nonRespondingStudents).toBe(0);
  });
});