import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProject,
  fetchModulesForUser,
  fetchProjectById,
  fetchProjectDeadline,
  fetchProjectsForUser,
  fetchProjectsWithTeamsForStaffMarking,
  fetchQuestionsForProject,
  fetchTeamAllocationQuestionnaireForProject,
  submitTeamAllocationQuestionnaireResponse,
  fetchTeamById,
  fetchTeamByUserAndProject,
  fetchTeammatesForProject,
  upsertStaffStudentDeadlineOverride,
} from "./service.js";
import * as repo from "./repo.js";
import * as notificationsService from "../notifications/service.js";

vi.mock("./repo.js", () => ({
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
  getTeamAllocationQuestionnaireSubmissionContext: vi.fn(),
  hasActiveTeamForUserInProject: vi.fn(),
  upsertTeamAllocationQuestionnaireResponse: vi.fn(),
  getStaffProjectsForMarking: vi.fn(),
  createTeamWarning: vi.fn(),
  getTeamWarningsForTeamInProject: vi.fn(),
  getStaffProjectWarningsConfig: vi.fn(),
  getStaffProjectNavFlagsConfig: vi.fn(),
  updateStaffProjectNavFlagsConfig: vi.fn(),
  updateStaffProjectWarningsConfig: vi.fn(),
  getProjectWarningsSettings: vi.fn(),
  getProjectTeamWarningSignals: vi.fn(),
  getActiveAutoTeamWarningsForProject: vi.fn(),
  resolveTeamWarningById: vi.fn(),
  updateAutoTeamWarningById: vi.fn(),
  upsertStaffStudentDeadlineOverride: vi.fn(),
  clearStaffStudentDeadlineOverride: vi.fn(),
}));
vi.mock("../notifications/service.js", () => ({
  addNotification: vi.fn(),
}));

vi.mock("../../shared/projectWriteGuard.js", () => ({
  assertProjectMutableForWritesByProjectId: vi.fn().mockResolvedValue(undefined),
  assertProjectMutableForWritesByTeamId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../shared/db.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../shared/db.js")>();
  return {
    ...mod,
    prisma: {
      ...mod.prisma,
      project: {
        ...mod.prisma.project,
        findUnique: vi.fn().mockResolvedValue({
          archivedAt: null,
          module: { archivedAt: null },
        }),
      },
    },
  };
});

type RepoAsyncResult<T extends (...args: unknown[]) => Promise<unknown>> = Awaited<ReturnType<T>>;

const createProjectMock = vi.mocked(repo.createProject);
const getProjectByIdMock = vi.mocked(repo.getProjectById);
const getUserProjectsMock = vi.mocked(repo.getUserProjects);
const getModulesForUserMock = vi.mocked(repo.getModulesForUser);
const getTeammatesInProjectMock = vi.mocked(repo.getTeammatesInProject);
const getUserProjectDeadlineMock = vi.mocked(repo.getUserProjectDeadline);
const getTeamByIdMock = vi.mocked(repo.getTeamById);
const getTeamByUserAndProjectMock = vi.mocked(repo.getTeamByUserAndProject);
const getQuestionsForProjectMock = vi.mocked(repo.getQuestionsForProject);
const getStaffProjectsForMarkingMock = vi.mocked(repo.getStaffProjectsForMarking);
describe("projects service", () => {
  const deadlineInput = {
    taskOpenDate: new Date("2026-03-01T09:00:00.000Z"),
    taskDueDate: new Date("2026-03-08T17:00:00.000Z"),
    taskDueDateMcf: new Date("2026-03-15T17:00:00.000Z"),
    assessmentOpenDate: new Date("2026-03-09T09:00:00.000Z"),
    assessmentDueDate: new Date("2026-03-12T17:00:00.000Z"),
    assessmentDueDateMcf: new Date("2026-03-19T17:00:00.000Z"),
    feedbackOpenDate: new Date("2026-03-13T09:00:00.000Z"),
    feedbackDueDate: new Date("2026-03-16T17:00:00.000Z"),
    feedbackDueDateMcf: new Date("2026-03-23T17:00:00.000Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates createProject and fetchProjectById", async () => {
    (repo.createProject as any).mockResolvedValue({ id: 9 });
    (repo.getProjectById as any).mockResolvedValue({
      id: 9,
      name: "P1",
      informationText: null,
      archivedAt: null,
      moduleId: 2,
      questionnaireTemplateId: 3,
      teamAllocationQuestionnaireTemplateId: 4,
      projectNavFlags: null,
      module: { name: "SEGP", archivedAt: null },
    });

    await expect(createProject(7, "P1", 2, 3, undefined, null, deadlineInput)).resolves.toEqual({ id: 9 });
    expect(repo.createProject).toHaveBeenCalledWith(7, "P1", 2, 3, undefined, null, deadlineInput, undefined);

    await expect(fetchProjectById(9)).resolves.toEqual({
      id: 9,
      name: "P1",
      moduleName: "SEGP",
      informationText: null,
      archivedAt: null,
      moduleId: 2,
      questionnaireTemplateId: 3,
      teamAllocationQuestionnaireTemplateId: 4,
      moduleArchivedAt: null,
      projectNavFlags: expect.objectContaining({ version: 1 }),
    });
    expect(repo.getProjectById).toHaveBeenCalledWith(9);
  });

  it("maps user projects to API shape with fallback module name", async () => {
    (repo.getUserProjects as any).mockResolvedValue([
      {
        id: 1,
        name: "A",
        moduleId: 10,
        module: { name: "SEGP" },
        deadline: { taskOpenDate: new Date("2026-02-01T00:00:00.000Z") },
      },
      { id: 2, name: "B", moduleId: 11, module: null, deadline: null },
    ]);

    await expect(fetchProjectsForUser(7)).resolves.toEqual([
      {
        id: 1,
        name: "A",
        moduleId: 10,
        moduleName: "SEGP",
        archivedAt: null,
        taskOpenDate: "2026-02-01T00:00:00.000Z",
      },
      { id: 2, name: "B", moduleId: 11, moduleName: "", archivedAt: null, taskOpenDate: null },
    ]);
  });

  it("fetchModulesForUser maps module fields to API shape", async () => {
    const projectWindowStart = new Date("2025-01-10T00:00:00.000Z");
    const projectWindowEnd = new Date("2025-06-01T00:00:00.000Z");
    (repo.getModulesForUser as any).mockResolvedValue([
      {
        id: 9,
        code: "4CCS2DBS",
        name: "SEGP",
        briefText: null,
        expectationsText: null,
        readinessNotesText: null,
        leaderCount: 2,
        teachingAssistantCount: 1,
        projectWindowStart,
        projectWindowEnd,
        teamCount: 5,
        projectCount: 2,
        accessRole: "OWNER",
        archivedAt: null,
      },
    ]);

    await expect(fetchModulesForUser(7, { staffOnly: true, compact: true })).resolves.toEqual([
      {
        id: "9",
        code: "4CCS2DBS",
        title: "SEGP",
        briefText: undefined,
        expectationsText: undefined,
        readinessNotesText: undefined,
        leaderCount: 2,
        teachingAssistantCount: 1,
        projectWindowStart: projectWindowStart.toISOString(),
        projectWindowEnd: projectWindowEnd.toISOString(),
        teamCount: 5,
        projectCount: 2,
        accountRole: "OWNER",
        moduleLeadNames: [],
        archivedAt: null,
      },
    ]);
  });

  it("fetchModulesForUser normalizes null and invalid module date fields", async () => {
    const archivedAt = new Date("2025-07-01T00:00:00.000Z");
    (repo.getModulesForUser as any).mockResolvedValue([
      {
        id: 10,
        code: "MOD-10",
        name: "Null Windows",
        teamCount: 2,
        projectCount: 1,
        accessRole: "OWNER",
        projectWindowStart: null,
        projectWindowEnd: null,
        archivedAt,
        staffWithAccessCount: 4,
      },
      {
        id: 11,
        code: "MOD-11",
        name: "Invalid Windows",
        teamCount: 3,
        projectCount: 2,
        accessRole: "OWNER",
        projectWindowStart: "not-a-date",
        projectWindowEnd: 12345,
        archivedAt: "not-a-date",
      },
    ]);

    const result = await fetchModulesForUser(7, { staffOnly: true, compact: false });

    expect(result[0]).toEqual(
      expect.objectContaining({
        id: "10",
        title: "Null Windows",
        projectWindowStart: null,
        projectWindowEnd: null,
        archivedAt: archivedAt.toISOString(),
        staffWithAccessCount: 4,
      }),
    );
    expect(result[1]).toEqual(
      expect.objectContaining({
        id: "11",
        title: "Invalid Windows",
        archivedAt: null,
        staffWithAccessCount: 0,
      }),
    );
    expect(result[1]).not.toHaveProperty("projectWindowStart");
    expect(result[1]).not.toHaveProperty("projectWindowEnd");
  });

  it("fetchModulesForUser forwards module scope options to repo", async () => {
    (repo.getModulesForUser as any).mockResolvedValue([]);
    await fetchModulesForUser(7, { staffOnly: true, compact: true });
    expect(repo.getModulesForUser).toHaveBeenCalledWith(7, { staffOnly: true, compact: true });
  });

  it("scopes enrolled module project counts to projects assigned to the user", async () => {
    (repo.getModulesForUser as any).mockResolvedValue([
      {
        id: 5,
        code: "MOD-5",
        name: "Elementary Logic with Applications",
        briefText: null,
        expectationsText: null,
        readinessNotesText: null,
        leaderCount: 2,
        teachingAssistantCount: 1,
        teamCount: 6,
        projectCount: 3,
        accessRole: "ENROLLED",
      },
    ]);
    (repo.getUserProjects as any).mockResolvedValue([
      { id: 11, moduleId: 5, name: "Project A", module: { name: "Elementary Logic with Applications" } },
    ]);

    await expect(fetchModulesForUser(7)).resolves.toEqual([
      expect.objectContaining({
        id: "5",
        accountRole: "ENROLLED",
        projectCount: 1,
      }),
    ]);
  });

  it("delegates teammates, deadlines, team and questions fetchers", async () => {
    (repo.getTeammatesInProject as any).mockResolvedValue([{ userId: 4 }]);
    (repo.getUserProjectDeadline as any).mockResolvedValue({ taskDueDate: "2026-03-01" });
    (repo.getTeamById as any).mockResolvedValue({ id: 3 });
    (repo.getTeamByUserAndProject as any).mockResolvedValue({ id: 3 });
    (repo.getQuestionsForProject as any).mockResolvedValue({ questionnaireTemplate: { id: 8 } });
    (repo.getTeamAllocationQuestionnaireForProject as any).mockResolvedValue({
      teamAllocationQuestionnaireTemplate: { id: 11 },
    });

    await expect(fetchTeammatesForProject(1, 2)).resolves.toEqual([{ userId: 4 }]);
    await expect(fetchProjectDeadline(1, 2)).resolves.toEqual({ taskDueDate: "2026-03-01" });
    await expect(fetchTeamById(3)).resolves.toEqual({ id: 3 });
    await expect(fetchTeamByUserAndProject(1, 2)).resolves.toEqual({ id: 3 });
    await expect(fetchQuestionsForProject(2)).resolves.toEqual({ questionnaireTemplate: { id: 8 } });
    await expect(fetchTeamAllocationQuestionnaireForProject(2)).resolves.toEqual({
      teamAllocationQuestionnaireTemplate: { id: 11 },
    });
  });

  it("submitTeamAllocationQuestionnaireResponse validates context and saves normalized answers", async () => {
    (repo.getTeamAllocationQuestionnaireSubmissionContext as any).mockResolvedValue({
      projectId: 3,
      enterpriseId: "ent-1",
      template: {
        id: 91,
        purpose: "CUSTOMISED_ALLOCATION",
        questions: [{ id: 1, type: "multiple-choice", configs: { options: ["A", "B"] } }],
      },
    });
    (repo.hasActiveTeamForUserInProject as any).mockResolvedValue(false);
    (repo.upsertTeamAllocationQuestionnaireResponse as any).mockResolvedValue({
      id: 700,
      updatedAt: new Date("2026-03-30T22:05:00.000Z"),
    });

    await expect(
      submitTeamAllocationQuestionnaireResponse(11, 3, { 1: "A" }),
    ).resolves.toEqual({
      id: 700,
      updatedAt: "2026-03-30T22:05:00.000Z",
    });

    expect(repo.upsertTeamAllocationQuestionnaireResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 3,
        enterpriseId: "ent-1",
        templateId: 91,
        reviewerUserId: 11,
      }),
    );
  });

  it("retains numeric project-id matches for staff marking queries", async () => {
    getStaffProjectsForMarkingMock.mockResolvedValue([
      {
        id: 42,
        name: "Capstone",
        moduleId: 8,
        module: { name: "SEGP" },
        teams: [
          {
            id: 3,
            teamName: "Team Alpha",
            projectId: 42,
            inactivityFlag: "NONE",
            _count: { allocations: 5 },
            staffTeamMarking: { mark: 72 },
          },
        ],
      },
    ] as unknown as RepoAsyncResult<typeof repo.getStaffProjectsForMarking>);

    await expect(fetchProjectsWithTeamsForStaffMarking(9, { query: "42" })).resolves.toEqual([
      {
        id: 42,
        name: "Capstone",
        moduleId: 8,
        moduleName: "SEGP",
        markingProgress: { markedTeamCount: 1, totalTeamCount: 1 },
        teams: [
          { id: 3, teamName: "Team Alpha", projectId: 42, inactivityFlag: "NONE", studentCount: 5, teamMark: 72 },
        ],
      },
    ]);
  });

  it("keeps only matching teams when a staff marking query matches team names but not the project/module", async () => {
    getStaffProjectsForMarkingMock.mockResolvedValue([
      {
        id: 42,
        name: "Capstone",
        moduleId: 8,
        module: { name: "SEGP" },
        teams: [
          {
            id: 3,
            teamName: "Team Alpha",
            projectId: 42,
            inactivityFlag: "NONE",
            _count: { allocations: 5 },
            staffTeamMarking: { mark: null },
          },
          {
            id: 4,
            teamName: "Delta Builders",
            projectId: 42,
            inactivityFlag: "YELLOW",
            _count: { allocations: 4 },
            staffTeamMarking: { mark: 61 },
          },
        ],
      },
    ] as unknown as RepoAsyncResult<typeof repo.getStaffProjectsForMarking>);

    await expect(fetchProjectsWithTeamsForStaffMarking(9, { query: "delta" })).resolves.toEqual([
      {
        id: 42,
        name: "Capstone",
        moduleId: 8,
        moduleName: "SEGP",
        markingProgress: { markedTeamCount: 1, totalTeamCount: 2 },
        teams: [
          { id: 4, teamName: "Delta Builders", projectId: 42, inactivityFlag: "YELLOW", studentCount: 4, teamMark: 61 },
        ],
      },
    ]);
  });

  it("notifies the student when a deadline override is granted", async () => {
    (repo.upsertStaffStudentDeadlineOverride as any).mockResolvedValue({ id: 55 });

    await upsertStaffStudentDeadlineOverride(1, 3, 9, { taskDueDate: new Date() });

    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 9, type: "DEADLINE_OVERRIDE_GRANTED" })
    );
  });
});
