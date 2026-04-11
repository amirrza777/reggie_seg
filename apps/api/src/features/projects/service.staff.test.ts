import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── repo mock ───────────────────────────────────────────────────────────────
const repoMocks = vi.hoisted(() => ({
  getStaffProjects: vi.fn(),
  getStaffProjectTeams: vi.fn(),
  getStaffViewerModuleAccessLabel: vi.fn(),
  getUserProjectMarking: vi.fn(),
  getModuleStaffListForUser: vi.fn(),
  getModuleStudentProjectMatrixForUser: vi.fn(),
  getTeamAllocationQuestionnaireSubmissionContext: vi.fn(),
  hasActiveTeamForUserInProject: vi.fn(),
  upsertTeamAllocationQuestionnaireResponse: vi.fn(),
  hasTeamAllocationQuestionnaireResponse: vi.fn(),
  // keep stubs for functions imported by barrel
  getProjectById: vi.fn(),
  getUserProjects: vi.fn(),
  getModulesForUser: vi.fn(),
  createProject: vi.fn(),
  getTeammatesInProject: vi.fn(),
  getUserProjectDeadline: vi.fn(),
  getTeamById: vi.fn(),
  getTeamByUserAndProject: vi.fn(),
  getQuestionsForProject: vi.fn(),
  getTeamAllocationQuestionnaireForProject: vi.fn(),
  getStaffProjectsForMarking: vi.fn(),
  upsertStaffStudentDeadlineOverride: vi.fn(),
  clearStaffStudentDeadlineOverride: vi.fn(),
  resolveTeamWarningById: vi.fn(),
  updateAutoTeamWarningById: vi.fn(),
  getStaffProjectWarningsConfig: vi.fn(),
  getStaffProjectNavFlagsConfig: vi.fn(),
  updateStaffProjectNavFlagsConfig: vi.fn(),
  updateStaffProjectWarningsConfig: vi.fn(),
  getProjectWarningsSettings: vi.fn(),
  getProjectTeamWarningSignals: vi.fn(),
  getActiveAutoTeamWarningsForProject: vi.fn(),
  createTeamWarning: vi.fn(),
  getTeamWarningsForTeamInProject: vi.fn(),
}));

vi.mock("./repo.js", () => repoMocks);

vi.mock("../../shared/projectWriteGuard.js", () => ({
  assertProjectMutableForWritesByProjectId: vi.fn().mockResolvedValue(undefined),
  assertProjectMutableForWritesByTeamId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../notifications/service.js", () => ({ addNotification: vi.fn() }));

// ─── prisma mock ─────────────────────────────────────────────────────────────
const prismaMocks = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  moduleLead: { findUnique: vi.fn() },
  project: { findUnique: vi.fn().mockResolvedValue({ archivedAt: null, module: { archivedAt: null } }) },
}));

vi.mock("../../shared/db.js", () => ({ prisma: prismaMocks }));

import {
  fetchProjectsForStaff,
  fetchProjectTeamsForStaff,
  fetchProjectMarking,
  fetchModuleStaffList,
  fetchModuleStudentProjectMatrix,
  submitTeamAllocationQuestionnaireResponse,
  fetchTeamAllocationQuestionnaireStatusForUser,
} from "./service.js";

// ─── helpers ─────────────────────────────────────────────────────────────────
function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "Capstone",
    moduleId: 5,
    module: { name: "SEGP", archivedAt: null },
    archivedAt: null,
    createdAt: new Date("2026-01-01"),
    deadline: null,
    _count: { githubRepositories: 0, projectStudents: 0 },
    teams: [],
    ...overrides,
  };
}

function makeTeam(overrides: Record<string, unknown> = {}) {
  return {
    trelloBoardId: null,
    allocations: [],
    _count: { peerAssessments: 0 },
    ...overrides,
  };
}

describe("projects service — staff functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── fetchProjectsForStaff ─────────────────────────────────────────────────
  describe("fetchProjectsForStaff", () => {
    it("returns empty array when no projects", async () => {
      repoMocks.getStaffProjects.mockResolvedValue([]);
      expect(await fetchProjectsForStaff(1)).toEqual([]);
    });

    it("maps project to API shape with computed stats", async () => {
      repoMocks.getStaffProjects.mockResolvedValue([makeProject()]);
      const [result] = await fetchProjectsForStaff(1);
      expect(result).toMatchObject({
        id: 1,
        name: "Capstone",
        moduleId: 5,
        moduleName: "SEGP",
        archivedAt: null,
        teamCount: 0,
        hasGithubRepo: false,
        membersTotal: 0,
        membersConnected: 0,
        githubIntegrationPercent: 0,
        trelloBoardsLinkedPercent: 0,
        peerAssessmentsSubmittedPercent: 0,
      });
    });

    it("computes trello linked percent from teams", async () => {
      const teams = [
        makeTeam({ trelloBoardId: "board-1" }),
        makeTeam({ trelloBoardId: "board-2" }),
        makeTeam({ trelloBoardId: null }),
      ];
      repoMocks.getStaffProjects.mockResolvedValue([makeProject({ teams })]);
      const [result] = await fetchProjectsForStaff(1);
      expect(result.trelloBoardsLinkedPercent).toBe(67); // 2/3 rounded
      expect(result.trelloBoardsLinkedCount).toBe(2);
    });

    it("computes peer assessment percent from team allocations and submissions", async () => {
      // n=3 members → expected = 3*2 = 6 per team
      const teams = [
        makeTeam({
          allocations: [{ user: { githubAccount: null } }, { user: { githubAccount: null } }, { user: { githubAccount: null } }],
          _count: { peerAssessments: 3 },
        }),
      ];
      repoMocks.getStaffProjects.mockResolvedValue([makeProject({ teams })]);
      const [result] = await fetchProjectsForStaff(1);
      expect(result.peerAssessmentsSubmittedPercent).toBe(50); // 3/6
      expect(result.peerAssessmentsSubmittedCount).toBe(3);
      expect(result.peerAssessmentsExpectedCount).toBe(6);
    });

    it("computes github connection percent", async () => {
      const teams = [
        makeTeam({
          allocations: [
            { user: { githubAccount: { id: 10 } } },
            { user: { githubAccount: null } },
          ],
        }),
      ];
      repoMocks.getStaffProjects.mockResolvedValue([makeProject({ teams })]);
      const [result] = await fetchProjectsForStaff(1);
      expect(result.githubIntegrationPercent).toBe(50);
      expect(result.membersConnected).toBe(1);
    });

    it("uses projectStudents count over allocations when > 0", async () => {
      const teams = [makeTeam({ allocations: [{ user: { githubAccount: null } }] })];
      repoMocks.getStaffProjects.mockResolvedValue([
        makeProject({ teams, _count: { githubRepositories: 0, projectStudents: 10 } }),
      ]);
      const [result] = await fetchProjectsForStaff(1);
      expect(result.membersTotal).toBe(10);
    });

    it("extracts dateRangeStart and dateRangeEnd from deadline", async () => {
      const deadline = {
        taskOpenDate: new Date("2026-01-01"),
        feedbackDueDate: new Date("2026-06-01"),
      };
      repoMocks.getStaffProjects.mockResolvedValue([makeProject({ deadline })]);
      const [result] = await fetchProjectsForStaff(1);
      expect(result.dateRangeStart).toBe(new Date("2026-01-01").toISOString());
      expect(result.dateRangeEnd).toBe(new Date("2026-06-01").toISOString());
    });

    it("sets dateRangeStart and dateRangeEnd to null when no deadline", async () => {
      repoMocks.getStaffProjects.mockResolvedValue([makeProject({ deadline: null })]);
      const [result] = await fetchProjectsForStaff(1);
      expect(result.dateRangeStart).toBeNull();
      expect(result.dateRangeEnd).toBeNull();
    });

    it("sets hasGithubRepo true when githubRepositories count > 0", async () => {
      repoMocks.getStaffProjects.mockResolvedValue([
        makeProject({ _count: { githubRepositories: 1, projectStudents: 0 } }),
      ]);
      const [result] = await fetchProjectsForStaff(1);
      expect(result.hasGithubRepo).toBe(true);
    });

    it("skips teams with fewer than 2 members in peer assessment stats", async () => {
      const teams = [makeTeam({ allocations: [{ user: { githubAccount: null } }], _count: { peerAssessments: 1 } })];
      repoMocks.getStaffProjects.mockResolvedValue([makeProject({ teams })]);
      const [result] = await fetchProjectsForStaff(1);
      expect(result.peerAssessmentsExpectedCount).toBe(0);
      expect(result.peerAssessmentsSubmittedPercent).toBe(0);
    });
  });

  // ── fetchProjectTeamsForStaff ─────────────────────────────────────────────
  describe("fetchProjectTeamsForStaff", () => {
    it("returns null when project not found", async () => {
      repoMocks.getStaffProjectTeams.mockResolvedValue(null);
      expect(await fetchProjectTeamsForStaff(1, 99)).toBeNull();
    });

    it("includes canManageProjectSettings true for ADMIN", async () => {
      repoMocks.getStaffProjectTeams.mockResolvedValue({
        id: 1, name: "P", moduleId: 5, module: { name: "M", archivedAt: null }, archivedAt: null, teams: [],
      });
      repoMocks.getStaffViewerModuleAccessLabel.mockResolvedValue("MODULE_LEAD");
      prismaMocks.user.findUnique.mockResolvedValue({ role: "ADMIN" });
      const result = await fetchProjectTeamsForStaff(1, 1);
      expect(result!.project.canManageProjectSettings).toBe(true);
    });

    it("includes canManageProjectSettings true for ENTERPRISE_ADMIN", async () => {
      repoMocks.getStaffProjectTeams.mockResolvedValue({
        id: 1, name: "P", moduleId: 5, module: { name: "M", archivedAt: null }, archivedAt: null, teams: [],
      });
      repoMocks.getStaffViewerModuleAccessLabel.mockResolvedValue("TA");
      prismaMocks.user.findUnique.mockResolvedValue({ role: "ENTERPRISE_ADMIN" });
      const result = await fetchProjectTeamsForStaff(1, 1);
      expect(result!.project.canManageProjectSettings).toBe(true);
    });

    it("sets canManageProjectSettings true for STAFF who is module lead", async () => {
      repoMocks.getStaffProjectTeams.mockResolvedValue({
        id: 1, name: "P", moduleId: 5, module: { name: "M", archivedAt: null }, archivedAt: null, teams: [],
      });
      repoMocks.getStaffViewerModuleAccessLabel.mockResolvedValue("MODULE_LEAD");
      prismaMocks.user.findUnique.mockResolvedValue({ role: "STAFF" });
      prismaMocks.moduleLead.findUnique.mockResolvedValue({ userId: 1 });
      const result = await fetchProjectTeamsForStaff(1, 1);
      expect(result!.project.canManageProjectSettings).toBe(true);
    });

    it("sets canManageProjectSettings false for STAFF who is not module lead", async () => {
      repoMocks.getStaffProjectTeams.mockResolvedValue({
        id: 1, name: "P", moduleId: 5, module: { name: "M", archivedAt: null }, archivedAt: null, teams: [],
      });
      repoMocks.getStaffViewerModuleAccessLabel.mockResolvedValue("TA");
      prismaMocks.user.findUnique.mockResolvedValue({ role: "STAFF" });
      prismaMocks.moduleLead.findUnique.mockResolvedValue(null);
      const result = await fetchProjectTeamsForStaff(1, 1);
      expect(result!.project.canManageProjectSettings).toBe(false);
    });

    it("maps teams to API shape", async () => {
      const team = {
        id: 10,
        teamName: "Alpha",
        projectId: 1,
        allocationLifecycle: "OPEN",
        createdAt: new Date("2026-01-01"),
        inactivityFlag: "NONE",
        deadlineProfile: "STANDARD",
        deadlineOverride: null,
        trelloBoardId: "board-1",
        allocations: [{ userId: 2 }],
      };
      repoMocks.getStaffProjectTeams.mockResolvedValue({
        id: 1, name: "P", moduleId: 5, module: { name: "M", archivedAt: null }, archivedAt: null, teams: [team],
      });
      repoMocks.getStaffViewerModuleAccessLabel.mockResolvedValue("MODULE_LEAD");
      prismaMocks.user.findUnique.mockResolvedValue({ role: "ADMIN" });
      const result = await fetchProjectTeamsForStaff(1, 1);
      expect(result!.teams[0]).toMatchObject({
        id: 10,
        teamName: "Alpha",
        trelloBoardId: "board-1",
        hasDeadlineOverride: false,
        allocations: [{ userId: 2 }],
      });
    });
  });

  // ── fetchProjectMarking ───────────────────────────────────────────────────
  describe("fetchProjectMarking", () => {
    it("delegates to getUserProjectMarking", async () => {
      repoMocks.getUserProjectMarking.mockResolvedValue({ mark: 80 });
      const result = await fetchProjectMarking(1, 5);
      expect(repoMocks.getUserProjectMarking).toHaveBeenCalledWith(1, 5);
      expect(result).toEqual({ mark: 80 });
    });
  });

  // ── fetchModuleStaffList & fetchModuleStudentProjectMatrix ─────────────────
  describe("fetchModuleStaffList", () => {
    it("delegates to getModuleStaffListForUser", async () => {
      repoMocks.getModuleStaffListForUser.mockResolvedValue([{ id: 1 }]);
      const result = await fetchModuleStaffList(1, 5);
      expect(repoMocks.getModuleStaffListForUser).toHaveBeenCalledWith(1, 5);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe("fetchModuleStudentProjectMatrix", () => {
    it("delegates to getModuleStudentProjectMatrixForUser", async () => {
      repoMocks.getModuleStudentProjectMatrixForUser.mockResolvedValue([]);
      await fetchModuleStudentProjectMatrix(1, 5);
      expect(repoMocks.getModuleStudentProjectMatrixForUser).toHaveBeenCalledWith(1, 5);
    });
  });

  // ── submitTeamAllocationQuestionnaireResponse error branches ──────────────
  describe("submitTeamAllocationQuestionnaireResponse — error branches", () => {
    it("throws PROJECT_OR_TEMPLATE_NOT_FOUND_OR_FORBIDDEN when no context", async () => {
      repoMocks.getTeamAllocationQuestionnaireSubmissionContext.mockResolvedValue(null);
      await expect(submitTeamAllocationQuestionnaireResponse(1, 1, {}))
        .rejects.toEqual({ code: "PROJECT_OR_TEMPLATE_NOT_FOUND_OR_FORBIDDEN" });
    });

    it("throws TEMPLATE_INVALID_PURPOSE when purpose is not CUSTOMISED_ALLOCATION", async () => {
      repoMocks.getTeamAllocationQuestionnaireSubmissionContext.mockResolvedValue({
        projectId: 1, enterpriseId: "e1",
        template: { id: 1, purpose: "PEER_ASSESSMENT", questions: [] },
      });
      await expect(submitTeamAllocationQuestionnaireResponse(1, 1, {}))
        .rejects.toEqual({ code: "TEMPLATE_INVALID_PURPOSE" });
    });

    it("throws QUESTIONNAIRE_WINDOW_NOT_OPEN when before open date", async () => {
      repoMocks.getTeamAllocationQuestionnaireSubmissionContext.mockResolvedValue({
        projectId: 1, enterpriseId: "e1",
        template: { id: 1, purpose: "CUSTOMISED_ALLOCATION", questions: [] },
        teamAllocationQuestionnaireOpenDate: new Date(Date.now() + 86_400_000), // tomorrow
        teamAllocationQuestionnaireDueDate: new Date(Date.now() + 2 * 86_400_000),
      });
      await expect(submitTeamAllocationQuestionnaireResponse(1, 1, {}))
        .rejects.toEqual({ code: "QUESTIONNAIRE_WINDOW_NOT_OPEN" });
    });

    it("throws QUESTIONNAIRE_WINDOW_CLOSED when after close date", async () => {
      repoMocks.getTeamAllocationQuestionnaireSubmissionContext.mockResolvedValue({
        projectId: 1, enterpriseId: "e1",
        template: { id: 1, purpose: "CUSTOMISED_ALLOCATION", questions: [] },
        teamAllocationQuestionnaireOpenDate: null,
        teamAllocationQuestionnaireDueDate: new Date(Date.now() - 86_400_000), // yesterday
      });
      await expect(submitTeamAllocationQuestionnaireResponse(1, 1, {}))
        .rejects.toEqual({ code: "QUESTIONNAIRE_WINDOW_CLOSED" });
    });

    it("throws TEMPLATE_CONTAINS_UNSUPPORTED_QUESTION_TYPES for text questions", async () => {
      repoMocks.getTeamAllocationQuestionnaireSubmissionContext.mockResolvedValue({
        projectId: 1, enterpriseId: "e1",
        template: {
          id: 1, purpose: "CUSTOMISED_ALLOCATION",
          questions: [{ id: 1, type: "text", configs: {} }],
        },
        teamAllocationQuestionnaireOpenDate: null,
        teamAllocationQuestionnaireDueDate: null,
      });
      await expect(submitTeamAllocationQuestionnaireResponse(1, 1, {}))
        .rejects.toEqual({ code: "TEMPLATE_CONTAINS_UNSUPPORTED_QUESTION_TYPES" });
    });

    it("throws USER_ALREADY_IN_TEAM when user has active team", async () => {
      repoMocks.getTeamAllocationQuestionnaireSubmissionContext.mockResolvedValue({
        projectId: 1, enterpriseId: "e1",
        template: {
          id: 1, purpose: "CUSTOMISED_ALLOCATION",
          questions: [{ id: 1, type: "multiple-choice", configs: { options: ["A", "B"] } }],
        },
        teamAllocationQuestionnaireOpenDate: null,
        teamAllocationQuestionnaireDueDate: null,
      });
      repoMocks.hasActiveTeamForUserInProject.mockResolvedValue(true);
      await expect(submitTeamAllocationQuestionnaireResponse(1, 1, { 1: "A" }))
        .rejects.toEqual({ code: "USER_ALREADY_IN_TEAM" });
    });
  });

  // ── fetchTeamAllocationQuestionnaireStatusForUser ─────────────────────────
  describe("fetchTeamAllocationQuestionnaireStatusForUser", () => {
    it("returns null when no context found", async () => {
      repoMocks.getTeamAllocationQuestionnaireSubmissionContext.mockResolvedValue(null);
      expect(await fetchTeamAllocationQuestionnaireStatusForUser(1, 5)).toBeNull();
    });

    it("returns status with hasSubmitted and window open flags", async () => {
      const openDate = new Date(Date.now() - 86_400_000); // yesterday
      const dueDate = new Date(Date.now() + 86_400_000);  // tomorrow
      repoMocks.getTeamAllocationQuestionnaireSubmissionContext.mockResolvedValue({
        projectId: 5,
        template: {
          id: 10, purpose: "CUSTOMISED_ALLOCATION",
          questions: [{ id: 1, type: "multiple-choice" }],
        },
        teamAllocationQuestionnaireOpenDate: openDate,
        teamAllocationQuestionnaireDueDate: dueDate,
      });
      repoMocks.hasTeamAllocationQuestionnaireResponse.mockResolvedValue(false);
      const result = await fetchTeamAllocationQuestionnaireStatusForUser(1, 5);
      expect(result).not.toBeNull();
      expect(result!.hasSubmitted).toBe(false);
      expect(result!.windowIsOpen).toBe(true);
      expect(result!.questionnaireTemplate.id).toBe(10);
    });

    it("sets windowIsOpen false when past due date", async () => {
      repoMocks.getTeamAllocationQuestionnaireSubmissionContext.mockResolvedValue({
        projectId: 5,
        template: { id: 10, purpose: "CUSTOMISED_ALLOCATION", questions: [] },
        teamAllocationQuestionnaireOpenDate: null,
        teamAllocationQuestionnaireDueDate: new Date(Date.now() - 86_400_000), // yesterday
      });
      repoMocks.hasTeamAllocationQuestionnaireResponse.mockResolvedValue(true);
      const result = await fetchTeamAllocationQuestionnaireStatusForUser(1, 5);
      expect(result!.windowIsOpen).toBe(false);
      expect(result!.hasSubmitted).toBe(true);
    });

    it("sets windowIsOpen true when no open or close dates", async () => {
      repoMocks.getTeamAllocationQuestionnaireSubmissionContext.mockResolvedValue({
        projectId: 5,
        template: { id: 10, purpose: "CUSTOMISED_ALLOCATION", questions: [] },
        teamAllocationQuestionnaireOpenDate: null,
        teamAllocationQuestionnaireDueDate: null,
      });
      repoMocks.hasTeamAllocationQuestionnaireResponse.mockResolvedValue(false);
      const result = await fetchTeamAllocationQuestionnaireStatusForUser(1, 5);
      expect(result!.windowIsOpen).toBe(true);
    });
  });
});
