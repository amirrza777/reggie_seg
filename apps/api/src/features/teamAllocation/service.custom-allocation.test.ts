import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyCustomAllocationForProject,
  getCustomAllocationCoverageForProject,
  listCustomAllocationQuestionnairesForProject,
  previewCustomAllocationForProject,
} from "./service.js";
import * as repo from "./repo.js";
import { sendEmail } from "../../shared/email.js";
import { prisma } from "../../shared/db.js";

vi.mock("./repo.js", () => ({
  applyManualAllocationTeam: vi.fn(),
  applyRandomAllocationPlan: vi.fn(),
  createTeamInviteRecord: vi.fn(),
  findCustomAllocationQuestionnairesForStaff: vi.fn(),
  findCustomAllocationTemplateForStaff: vi.fn(),
  findActiveInvite: vi.fn(),
  findInviteContext: vi.fn(),
  findLatestCustomAllocationResponsesForStudents: vi.fn(),
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

  it("previewCustomAllocationForProject validates input", async () => {
    await expect(
      previewCustomAllocationForProject(7, 42, {
        questionnaireTemplateId: 5,
        teamCount: 0,
        nonRespondentStrategy: "distribute_randomly",
        criteria: [],
      }),
    ).rejects.toEqual({ code: "INVALID_TEAM_COUNT" });

    await expect(
      previewCustomAllocationForProject(7, 42, {
        questionnaireTemplateId: 0,
        teamCount: 2,
        nonRespondentStrategy: "distribute_randomly",
        criteria: [],
      }),
    ).rejects.toEqual({ code: "INVALID_TEMPLATE_ID" });

    await expect(
      previewCustomAllocationForProject(7, 42, {
        questionnaireTemplateId: 5,
        teamCount: 2,
        nonRespondentStrategy: "invalid" as any,
        criteria: [],
      }),
    ).rejects.toEqual({ code: "INVALID_NON_RESPONDENT_STRATEGY" });

    await expect(
      previewCustomAllocationForProject(7, 42, {
        questionnaireTemplateId: 5,
        teamCount: 2,
        nonRespondentStrategy: "distribute_randomly",
        criteria: [{ questionId: 11, strategy: "diversify", weight: 7 }],
      }),
    ).rejects.toEqual({ code: "INVALID_CRITERIA" });
  });

  it("previewCustomAllocationForProject enforces scope/template/student guards", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValueOnce(null);
    await expect(
      previewCustomAllocationForProject(7, 42, {
        questionnaireTemplateId: 5,
        teamCount: 2,
        nonRespondentStrategy: "distribute_randomly",
        criteria: [{ questionId: 11, strategy: "diversify", weight: 2 }],
      }),
    ).rejects.toEqual({ code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" });

    (repo.findStaffScopedProject as any).mockResolvedValueOnce({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: new Date(),
      enterpriseId: "ent-9",
    });
    await expect(
      previewCustomAllocationForProject(7, 42, {
        questionnaireTemplateId: 5,
        teamCount: 2,
        nonRespondentStrategy: "distribute_randomly",
        criteria: [{ questionId: 11, strategy: "diversify", weight: 2 }],
      }),
    ).rejects.toEqual({ code: "PROJECT_ARCHIVED" });

    (repo.findStaffScopedProject as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
    });
    (repo.findCustomAllocationTemplateForStaff as any).mockResolvedValueOnce(null);
    await expect(
      previewCustomAllocationForProject(7, 42, {
        questionnaireTemplateId: 5,
        teamCount: 2,
        nonRespondentStrategy: "distribute_randomly",
        criteria: [{ questionId: 11, strategy: "diversify", weight: 2 }],
      }),
    ).rejects.toEqual({ code: "TEMPLATE_NOT_FOUND_OR_FORBIDDEN" });

    (repo.findCustomAllocationTemplateForStaff as any).mockResolvedValueOnce({
      id: 5,
      templateName: "Team Setup",
      ownerId: 7,
      isPublic: false,
      questions: [{ id: 11, label: "Skill level", type: "rating" }],
    });
    (repo.findVacantModuleStudentsForProject as any).mockResolvedValueOnce([]);
    await expect(
      previewCustomAllocationForProject(7, 42, {
        questionnaireTemplateId: 5,
        teamCount: 2,
        nonRespondentStrategy: "distribute_randomly",
        criteria: [{ questionId: 11, strategy: "diversify", weight: 2 }],
      }),
    ).rejects.toEqual({ code: "NO_VACANT_STUDENTS" });

    (repo.findCustomAllocationTemplateForStaff as any).mockResolvedValueOnce({
      id: 5,
      templateName: "Team Setup",
      ownerId: 7,
      isPublic: false,
      questions: [{ id: 11, label: "Skill level", type: "rating" }],
    });
    (repo.findVacantModuleStudentsForProject as any).mockResolvedValueOnce([
      { id: 1, firstName: "A", lastName: "A", email: "a@example.com" },
    ]);
    await expect(
      previewCustomAllocationForProject(7, 42, {
        questionnaireTemplateId: 5,
        teamCount: 2,
        nonRespondentStrategy: "distribute_randomly",
        criteria: [{ questionId: 11, strategy: "diversify", weight: 2 }],
      }),
    ).rejects.toEqual({ code: "TEAM_COUNT_EXCEEDS_STUDENT_COUNT" });
  });

  it("previewCustomAllocationForProject rejects criteria that are not part of eligible template questions", async () => {
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
      questions: [{ id: 11, label: "Notes", type: "text" }],
    });

    await expect(
      previewCustomAllocationForProject(7, 42, {
        questionnaireTemplateId: 5,
        teamCount: 1,
        nonRespondentStrategy: "exclude",
        criteria: [{ questionId: 11, strategy: "diversify", weight: 2 }],
      }),
    ).rejects.toEqual({ code: "INVALID_CRITERIA" });
  });

  it("previewCustomAllocationForProject returns generated preview payload", async () => {
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
      questions: [
        { id: 11, label: "Skill level", type: "rating" },
        { id: 12, label: "Interest", type: "multiple-choice" },
      ],
    });
    (repo.findVacantModuleStudentsForProject as any).mockResolvedValue([
      { id: 1, firstName: "A", lastName: "A", email: "a@example.com" },
      { id: 2, firstName: "B", lastName: "B", email: "b@example.com" },
      { id: 3, firstName: "C", lastName: "C", email: "c@example.com" },
      { id: 4, firstName: "D", lastName: "D", email: "d@example.com" },
    ]);
    (repo.findLatestCustomAllocationResponsesForStudents as any).mockResolvedValue([
      { reviewerUserId: 1, answersJson: { "11": 1, "12": "Backend" } },
      { reviewerUserId: 2, answersJson: { "11": 5, "12": "Frontend" } },
      { reviewerUserId: 3, answersJson: [{ question: "11", answer: 3 }, { questionId: 12, answer: "Backend" }] },
    ]);

    const preview = await previewCustomAllocationForProject(7, 42, {
      questionnaireTemplateId: 5,
      teamCount: 2,
      seed: 2026,
      nonRespondentStrategy: "distribute_randomly",
      criteria: [
        { questionId: 11, strategy: "diversify", weight: 4 },
        { questionId: 12, strategy: "ignore", weight: 1 },
      ],
    });

    expect(repo.findLatestCustomAllocationResponsesForStudents).toHaveBeenCalledWith(42, 5, [1, 2, 3, 4]);
    expect(preview.project).toEqual({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
    });
    expect(preview.questionnaireTemplateId).toBe(5);
    expect(preview.previewId).toMatch(/^custom-preview-/);
    expect(preview.teamCount).toBe(2);
    expect(preview.respondentCount).toBe(3);
    expect(preview.nonRespondentCount).toBe(1);
    expect(preview.nonRespondentStrategy).toBe("distribute_randomly");
    expect(preview.criteriaSummary).toEqual([
      expect.objectContaining({
        questionId: 11,
        strategy: "diversify",
        weight: 4,
      }),
    ]);
    expect(preview.overallScore).toBeGreaterThanOrEqual(0);
    expect(preview.overallScore).toBeLessThanOrEqual(1);
    expect(preview.previewTeams).toHaveLength(2);
    const allMembers = preview.previewTeams.flatMap((team) => team.members);
    expect(allMembers).toHaveLength(4);
    expect(allMembers.filter((member) => member.responseStatus === "RESPONDED")).toHaveLength(3);
    expect(allMembers.filter((member) => member.responseStatus === "NO_RESPONSE")).toHaveLength(1);
  });

  it("applyCustomAllocationForProject validates input", async () => {
    await expect(
      applyCustomAllocationForProject(7, 42, {
        previewId: " ",
      }),
    ).rejects.toEqual({ code: "INVALID_PREVIEW_ID" });

    await expect(
      applyCustomAllocationForProject(7, 42, {
        previewId: "custom-preview-1",
        teamNames: ["Team A", 2 as any],
      }),
    ).rejects.toEqual({ code: "INVALID_TEAM_NAMES" });
  });

  it("applyCustomAllocationForProject enforces scope and preview integrity", async () => {
    (repo.findStaffScopedProject as any).mockResolvedValueOnce(null);
    await expect(
      applyCustomAllocationForProject(7, 42, {
        previewId: "missing",
      }),
    ).rejects.toEqual({ code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" });

    (repo.findStaffScopedProject as any).mockResolvedValueOnce({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: new Date(),
      enterpriseId: "ent-9",
    });
    await expect(
      applyCustomAllocationForProject(7, 42, {
        previewId: "missing",
      }),
    ).rejects.toEqual({ code: "PROJECT_ARCHIVED" });

    (repo.findStaffScopedProject as any).mockResolvedValue({
      id: 42,
      name: "Project A",
      moduleId: 11,
      moduleName: "Module A",
      archivedAt: null,
      enterpriseId: "ent-9",
    });
    await expect(
      applyCustomAllocationForProject(7, 42, {
        previewId: "missing",
      }),
    ).rejects.toEqual({ code: "PREVIEW_NOT_FOUND_OR_EXPIRED" });
  });

  it("applyCustomAllocationForProject applies a generated preview", async () => {
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
      questions: [
        { id: 11, label: "Skill level", type: "rating" },
        { id: 12, label: "Interest", type: "multiple-choice" },
      ],
    });
    (repo.findVacantModuleStudentsForProject as any).mockResolvedValue([
      { id: 1, firstName: "A", lastName: "A", email: "a@example.com" },
      { id: 2, firstName: "B", lastName: "B", email: "b@example.com" },
      { id: 3, firstName: "C", lastName: "C", email: "c@example.com" },
      { id: 4, firstName: "D", lastName: "D", email: "d@example.com" },
    ]);
    (repo.findLatestCustomAllocationResponsesForStudents as any).mockResolvedValue([
      { reviewerUserId: 1, answersJson: { "11": 1, "12": "Backend" } },
      { reviewerUserId: 2, answersJson: { "11": 5, "12": "Frontend" } },
      { reviewerUserId: 3, answersJson: { "11": 3, "12": "Backend" } },
    ]);
    (repo.applyRandomAllocationPlan as any).mockResolvedValue([
      { id: 200, teamName: "Team Orion", memberCount: 2 },
      { id: 201, teamName: "Team Vega", memberCount: 2 },
    ]);

    const preview = await previewCustomAllocationForProject(7, 42, {
      questionnaireTemplateId: 5,
      teamCount: 2,
      seed: 2026,
      nonRespondentStrategy: "distribute_randomly",
      criteria: [{ questionId: 11, strategy: "diversify", weight: 4 }],
    });

    const applied = await applyCustomAllocationForProject(7, 42, {
      previewId: preview.previewId,
      teamNames: ["Team Orion", "Team Vega"],
    });

    expect(repo.applyRandomAllocationPlan).toHaveBeenCalledWith(
      42,
      "ent-9",
      expect.any(Array),
      { teamNames: ["Team Orion", "Team Vega"] },
    );
    const plannedTeams = (repo.applyRandomAllocationPlan as any).mock.calls[0][2];
    expect(plannedTeams).toHaveLength(2);
    expect(plannedTeams.flatMap((team: any) => team.members).map((member: any) => member.id).sort((a: number, b: number) => a - b)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(applied).toEqual({
      project: {
        id: 42,
        name: "Project A",
        moduleId: 11,
        moduleName: "Module A",
      },
      previewId: preview.previewId,
      studentCount: 4,
      teamCount: 2,
      appliedTeams: [
        { id: 200, teamName: "Team Orion", memberCount: 2 },
        { id: 201, teamName: "Team Vega", memberCount: 2 },
      ],
    });
    expect(sendEmail).toHaveBeenCalledTimes(4);
  });

  it("applyCustomAllocationForProject rejects duplicate custom team names", async () => {
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
      questions: [{ id: 11, label: "Skill level", type: "rating" }],
    });
    (repo.findVacantModuleStudentsForProject as any).mockResolvedValue([
      { id: 1, firstName: "A", lastName: "A", email: "a@example.com" },
      { id: 2, firstName: "B", lastName: "B", email: "b@example.com" },
    ]);
    (repo.findLatestCustomAllocationResponsesForStudents as any).mockResolvedValue([
      { reviewerUserId: 1, answersJson: { "11": 1 } },
      { reviewerUserId: 2, answersJson: { "11": 5 } },
    ]);

    const preview = await previewCustomAllocationForProject(7, 42, {
      questionnaireTemplateId: 5,
      teamCount: 2,
      seed: 2026,
      nonRespondentStrategy: "exclude",
      criteria: [{ questionId: 11, strategy: "group", weight: 3 }],
    });

    await expect(
      applyCustomAllocationForProject(7, 42, {
        previewId: preview.previewId,
        teamNames: ["Team Same", "team same"],
      }),
    ).rejects.toEqual({ code: "DUPLICATE_TEAM_NAMES" });
  });
});