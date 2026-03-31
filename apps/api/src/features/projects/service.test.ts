import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProject,
  fetchModulesForUser,
  fetchProjectById,
  fetchProjectDeadline,
  fetchProjectsForUser,
  fetchProjectsWithTeamsForStaffMarking,
  fetchQuestionsForProject,
  joinModuleByCode,
  fetchTeamById,
  fetchTeamByUserAndProject,
  fetchTeammatesForProject,
  submitTeamHealthMessage,
  fetchMyTeamHealthMessages,
  fetchTeamHealthMessagesForStaff,
  upsertStaffStudentDeadlineOverride,
  createTeamWarningForStaff,
  fetchTeamWarningsForStaff,
  resolveTeamWarningForStaff,
  fetchMyTeamWarnings,
  fetchProjectWarningsConfigForStaff,
  updateProjectWarningsConfigForStaff,
  evaluateProjectWarningsForStaff,
  fetchProjectNavFlagsConfigForStaff,
  updateProjectNavFlagsConfigForStaff,
  getDefaultProjectNavFlagsConfig,
  parseProjectNavFlagsConfig,
  getDefaultProjectWarningsConfig,
  parseProjectWarningsConfig,
} from "./service.js";
import * as repo from "./repo.js";
import * as moduleJoinService from "../moduleJoin/service.js";
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
  getStaffProjectsForMarking: vi.fn(),
  createTeamHealthMessage: vi.fn(),
  getTeamHealthMessagesForUserInProject: vi.fn(),
  getTeamHealthMessagesForTeamInProject: vi.fn(),
  createTeamWarning: vi.fn(),
  getTeamWarningsForTeamInProject: vi.fn(),
  canStaffAccessTeamInProject: vi.fn(),
  getStaffProjectWarningsConfig: vi.fn(),
  getStaffProjectNavFlagsConfig: vi.fn(),
  updateStaffProjectNavFlagsConfig: vi.fn(),
  updateStaffProjectWarningsConfig: vi.fn(),
  getProjectWarningsSettings: vi.fn(),
  getProjectTeamWarningSignals: vi.fn(),
  getActiveAutoTeamWarningsForProject: vi.fn(),
  resolveTeamWarningById: vi.fn(),
  updateAutoTeamWarningById: vi.fn(),
  getModuleLeadsForProject: vi.fn(),
  upsertStaffStudentDeadlineOverride: vi.fn(),
  clearStaffStudentDeadlineOverride: vi.fn(),
}));
vi.mock("../moduleJoin/service.js", () => ({
  joinModuleByCode: vi.fn(),
}));
vi.mock("../notifications/service.js", () => ({
  addNotification: vi.fn(),
}));

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
const createTeamHealthMessageMock = vi.mocked(repo.createTeamHealthMessage);
const getTeamHealthMessagesForUserInProjectMock = vi.mocked(repo.getTeamHealthMessagesForUserInProject);
const getTeamHealthMessagesForTeamInProjectMock = vi.mocked(repo.getTeamHealthMessagesForTeamInProject);
const canStaffAccessTeamInProjectMock = vi.mocked(repo.canStaffAccessTeamInProject);
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
    (repo.getProjectById as any).mockResolvedValue({ id: 9, projectNavFlags: null });

    await expect(createProject(7, "P1", 2, 3, null, deadlineInput)).resolves.toEqual({ id: 9 });
    expect(repo.createProject).toHaveBeenCalledWith(7, "P1", 2, 3, null, deadlineInput);

    await expect(fetchProjectById(9)).resolves.toEqual({
      id: 9,
      projectNavFlags: expect.objectContaining({ version: 1 }),
    });
    expect(repo.getProjectById).toHaveBeenCalledWith(9);
  });

  it("maps user projects to API shape with fallback module name", async () => {
    (repo.getUserProjects as any).mockResolvedValue([
      { id: 1, name: "A", module: { name: "SEGP" } },
      { id: 2, name: "B", module: null },
    ]);

    await expect(fetchProjectsForUser(7)).resolves.toEqual([
      { id: 1, name: "A", moduleName: "SEGP", archivedAt: null },
      { id: 2, name: "B", moduleName: "", archivedAt: null },
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
        timelineText: "Timeline",
        expectationsText: null,
        readinessNotesText: null,
        leaderCount: 2,
        teachingAssistantCount: 1,
        projectWindowStart,
        projectWindowEnd,
        teamCount: 5,
        projectCount: 2,
        accessRole: "OWNER",
      },
    ]);

    await expect(fetchModulesForUser(7, { staffOnly: true, compact: true })).resolves.toEqual([
      {
        id: "9",
        code: "4CCS2DBS",
        title: "SEGP",
        briefText: undefined,
        timelineText: "Timeline",
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
      },
    ]);
  });

  it("fetchModulesForUser forwards module scope options to repo", async () => {
    (repo.getModulesForUser as any).mockResolvedValue([]);
    await fetchModulesForUser(7, { staffOnly: true, compact: true });
    expect(repo.getModulesForUser).toHaveBeenCalledWith(7, { staffOnly: true, compact: true });
  });

  it("joinModuleByCode restricts joins to students and maps idempotent enrollments", async () => {
    (moduleJoinService.joinModuleByCode as any).mockResolvedValueOnce({ ok: false, status: 403, error: "Forbidden" });
    await expect(joinModuleByCode(7, "ABCD-2345")).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Forbidden",
    });

    (moduleJoinService.joinModuleByCode as any).mockResolvedValueOnce({
      ok: true,
      value: { moduleId: 9, moduleName: "SEGP", result: "already_joined" },
    });
    await expect(joinModuleByCode(7, "abcd-2345")).resolves.toEqual({
      ok: true,
      value: {
        moduleId: 9,
        moduleName: "SEGP",
        result: "already_joined",
      },
    });
    expect(moduleJoinService.joinModuleByCode).toHaveBeenCalledWith(7, "abcd-2345");
  });

  it("joinModuleByCode rejects invalid or unavailable codes with the generic error", async () => {
    (moduleJoinService.joinModuleByCode as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      error: "Invalid or unavailable module code",
    });
    await expect(joinModuleByCode(7, "bad")).resolves.toEqual({
      ok: false,
      status: 400,
      error: "Invalid or unavailable module code",
    });

    (moduleJoinService.joinModuleByCode as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      error: "Invalid or unavailable module code",
    });
    await expect(joinModuleByCode(7, "ABCD2345")).resolves.toEqual({
      ok: false,
      status: 400,
      error: "Invalid or unavailable module code",
    });
  });

  it("delegates teammates, deadlines, team and questions fetchers", async () => {
    (repo.getTeammatesInProject as any).mockResolvedValue([{ userId: 4 }]);
    (repo.getUserProjectDeadline as any).mockResolvedValue({ taskDueDate: "2026-03-01" });
    (repo.getTeamById as any).mockResolvedValue({ id: 3 });
    (repo.getTeamByUserAndProject as any).mockResolvedValue({ id: 3 });
    (repo.getQuestionsForProject as any).mockResolvedValue({ questionnaireTemplate: { id: 8 } });

    await expect(fetchTeammatesForProject(1, 2)).resolves.toEqual([{ userId: 4 }]);
    await expect(fetchProjectDeadline(1, 2)).resolves.toEqual({ taskDueDate: "2026-03-01" });
    await expect(fetchTeamById(3)).resolves.toEqual({ id: 3 });
    await expect(fetchTeamByUserAndProject(1, 2)).resolves.toEqual({ id: 3 });
    await expect(fetchQuestionsForProject(2)).resolves.toEqual({ questionnaireTemplate: { id: 8 } });
  });

  it("retains numeric project-id matches for staff marking queries", async () => {
    getStaffProjectsForMarkingMock.mockResolvedValue([
      {
        id: 42,
        name: "Capstone",
        moduleId: 8,
        module: { name: "SEGP" },
        teams: [
          { id: 3, teamName: "Team Alpha", projectId: 42, inactivityFlag: "NONE", _count: { allocations: 5 } },
        ],
      },
    ] as unknown as RepoAsyncResult<typeof repo.getStaffProjectsForMarking>);

    await expect(fetchProjectsWithTeamsForStaffMarking(9, { query: "42" })).resolves.toEqual([
      {
        id: 42,
        name: "Capstone",
        moduleId: 8,
        moduleName: "SEGP",
        teams: [
          { id: 3, teamName: "Team Alpha", projectId: 42, inactivityFlag: "NONE", studentCount: 5 },
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
          { id: 3, teamName: "Team Alpha", projectId: 42, inactivityFlag: "NONE", _count: { allocations: 5 } },
          { id: 4, teamName: "Delta Builders", projectId: 42, inactivityFlag: "YELLOW", _count: { allocations: 4 } },
        ],
      },
    ] as unknown as RepoAsyncResult<typeof repo.getStaffProjectsForMarking>);

    await expect(fetchProjectsWithTeamsForStaffMarking(9, { query: "delta" })).resolves.toEqual([
      {
        id: 42,
        name: "Capstone",
        moduleId: 8,
        moduleName: "SEGP",
        teams: [
          { id: 4, teamName: "Delta Builders", projectId: 42, inactivityFlag: "YELLOW", studentCount: 4 },
        ],
      },
    ]);
  });

  it("submitTeamHealthMessage validates membership and creates request", async () => {
    (repo.getTeamByUserAndProject as any).mockResolvedValueOnce(null);
    await expect(submitTeamHealthMessage(7, 3, "Need support", "Please review")).resolves.toBeNull();
    expect(repo.createTeamHealthMessage).not.toHaveBeenCalled();

    (repo.getTeamByUserAndProject as any).mockResolvedValueOnce({ id: 22 });
    (repo.createTeamHealthMessage as any).mockResolvedValue({ id: 101, resolved: false });
    (repo.getModuleLeadsForProject as any).mockResolvedValue([]);
    await expect(submitTeamHealthMessage(7, 3, "Need support", "Please review")).resolves.toEqual({
      id: 101,
      resolved: false,
    });
    expect(repo.createTeamHealthMessage).toHaveBeenCalledWith(3, 22, 7, "Need support", "Please review");
  });

  it("fetchMyTeamHealthMessages requires membership and returns user requests", async () => {
    (repo.getTeamByUserAndProject as any).mockResolvedValueOnce(null);
    await expect(fetchMyTeamHealthMessages(7, 3)).resolves.toBeNull();
    expect(repo.getTeamHealthMessagesForUserInProject).not.toHaveBeenCalled();

    (repo.getTeamByUserAndProject as any).mockResolvedValueOnce({ id: 22 });
    (repo.getTeamHealthMessagesForUserInProject as any).mockResolvedValue([{ id: 1 }]);
    await expect(fetchMyTeamHealthMessages(7, 3)).resolves.toEqual([{ id: 1 }]);
    expect(repo.getTeamHealthMessagesForUserInProject).toHaveBeenCalledWith(3, 7);
  });

  it("fetchTeamHealthMessagesForStaff enforces staff scope before listing requests", async () => {
    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(false);
    await expect(fetchTeamHealthMessagesForStaff(9, 3, 22)).resolves.toBeNull();
    expect(repo.getTeamHealthMessagesForTeamInProject).not.toHaveBeenCalled();

    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.getTeamHealthMessagesForTeamInProject as any).mockResolvedValue([{ id: 4 }]);
    await expect(fetchTeamHealthMessagesForStaff(9, 3, 22)).resolves.toEqual([{ id: 4 }]);
    expect(repo.getTeamHealthMessagesForTeamInProject).toHaveBeenCalledWith(3, 22);
  });

  it("createTeamWarningForStaff requires staff access", async () => {
    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(false);
    await expect(
      createTeamWarningForStaff(9, 3, 22, {
        type: "LOW_ATTENDANCE",
        severity: "HIGH",
        title: "Attendance is low",
        details: "Less than 70% attendance in last 30 days.",
      }),
    ).resolves.toBeNull();
    expect(repo.createTeamWarning).not.toHaveBeenCalled();

    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.createTeamWarning as any).mockResolvedValueOnce({ id: 44, source: "MANUAL", createdByUserId: 9 });
    await expect(
      createTeamWarningForStaff(9, 3, 22, {
        type: "LOW_ATTENDANCE",
        severity: "HIGH",
        title: "Attendance is low",
        details: "Less than 70% attendance in last 30 days.",
      }),
    ).resolves.toEqual({ id: 44, source: "MANUAL", createdByUserId: 9 });
    expect(repo.createTeamWarning).toHaveBeenCalledWith(
      3,
      22,
      expect.objectContaining({ source: "MANUAL", createdByUserId: 9 }),
    );
  });

  it("fetchTeamWarningsForStaff enforces scope before listing", async () => {
    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(false);
    await expect(fetchTeamWarningsForStaff(9, 3, 22)).resolves.toBeNull();
    expect(repo.getTeamWarningsForTeamInProject).not.toHaveBeenCalled();

    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.getTeamWarningsForTeamInProject as any).mockResolvedValueOnce([{ id: 2 }]);
    await expect(fetchTeamWarningsForStaff(9, 3, 22)).resolves.toEqual([{ id: 2 }]);
    expect(repo.getTeamWarningsForTeamInProject).toHaveBeenCalledWith(3, 22);
  });

  it("resolveTeamWarningForStaff enforces scope and resolves only active warnings in team", async () => {
    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(false);
    await expect(resolveTeamWarningForStaff(9, 3, 22, 80)).resolves.toBeNull();
    expect(repo.getTeamWarningsForTeamInProject).not.toHaveBeenCalled();
    expect(repo.resolveTeamWarningById).not.toHaveBeenCalled();

    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.getTeamWarningsForTeamInProject as any).mockResolvedValueOnce([{ id: 81 }, { id: 82 }]);
    await expect(resolveTeamWarningForStaff(9, 3, 22, 80)).resolves.toBeNull();
    expect(repo.resolveTeamWarningById).not.toHaveBeenCalled();

    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.getTeamWarningsForTeamInProject as any).mockResolvedValueOnce([{ id: 80 }, { id: 81 }]);
    (repo.resolveTeamWarningById as any).mockResolvedValueOnce({ id: 80, active: false });
    await expect(resolveTeamWarningForStaff(9, 3, 22, 80)).resolves.toEqual({ id: 80, active: false });
    expect(repo.getTeamWarningsForTeamInProject).toHaveBeenCalledWith(3, 22, { activeOnly: true });
    expect(repo.resolveTeamWarningById).toHaveBeenCalledWith(80);
  });

  it("fetchMyTeamWarnings returns active warnings for current team", async () => {
    (repo.getTeamByUserAndProject as any).mockResolvedValueOnce(null);
    await expect(fetchMyTeamWarnings(7, 3)).resolves.toBeNull();
    expect(repo.getTeamWarningsForTeamInProject).not.toHaveBeenCalled();

    (repo.getTeamByUserAndProject as any).mockResolvedValueOnce({ id: 22 });
    (repo.getTeamWarningsForTeamInProject as any).mockResolvedValueOnce([{ id: 5, active: true }]);
    await expect(fetchMyTeamWarnings(7, 3)).resolves.toEqual([{ id: 5, active: true }]);
    expect(repo.getTeamWarningsForTeamInProject).toHaveBeenCalledWith(3, 22, { activeOnly: true });
  });

  it("parseProjectNavFlagsConfig validates shape and getDefaultProjectNavFlagsConfig returns defaults", async () => {
    const defaults = getDefaultProjectNavFlagsConfig();
    expect(defaults.version).toBe(1);
    expect(defaults.active.peer_assessment).toBe(true);
    expect(defaults.completed.team_health).toBe(true);
    expect(defaults.peerModes.peer_assessment).toBe("NATURAL");
    expect(defaults.peerModes.peer_feedback).toBe("NATURAL");

    expect(parseProjectNavFlagsConfig(null)).toBeNull();
    expect(parseProjectNavFlagsConfig({ version: 2, active: {}, completed: {} })).toBeNull();
    expect(
      parseProjectNavFlagsConfig({
        version: 1,
        active: { team: true },
        completed: {},
      }),
    ).toBeNull();

    expect(
      parseProjectNavFlagsConfig({
        version: 1,
        active: {
          team: true,
          meetings: true,
          peer_assessment: true,
          peer_feedback: true,
          repos: true,
          trello: true,
          discussion: true,
          team_health: true,
        },
        completed: {
          team: true,
          meetings: true,
          peer_assessment: false,
          peer_feedback: false,
          repos: true,
          trello: true,
          discussion: true,
          team_health: true,
        },
      }),
    ).toEqual({
      version: 1,
      active: {
        team: true,
        meetings: true,
        peer_assessment: true,
        peer_feedback: true,
        repos: true,
        trello: true,
        discussion: true,
        team_health: true,
      },
      completed: {
        team: true,
        meetings: true,
        peer_assessment: false,
        peer_feedback: false,
        repos: true,
        trello: true,
        discussion: true,
        team_health: true,
      },
      peerModes: {
        peer_assessment: "NATURAL",
        peer_feedback: "NATURAL",
      },
    });
  });

  it("fetchProjectNavFlagsConfigForStaff returns default config when missing/invalid", async () => {
    (repo.getStaffProjectNavFlagsConfig as any).mockResolvedValueOnce({
      id: 3,
      name: "Project A",
      projectNavFlags: null,
      deadline: null,
    });

    const result = await fetchProjectNavFlagsConfigForStaff(9, 3);
    expect(result).toEqual(
      expect.objectContaining({
        id: 3,
        name: "Project A",
        hasPersistedProjectNavFlags: false,
        projectNavFlags: expect.objectContaining({ version: 1 }),
        deadlineWindow: {
          assessmentOpenDate: null,
          feedbackOpenDate: null,
        },
      }),
    );
  });

  it("updateProjectNavFlagsConfigForStaff validates config and delegates update", async () => {
    await expect(updateProjectNavFlagsConfigForStaff(9, 3, null)).rejects.toMatchObject({
      code: "INVALID_PROJECT_NAV_FLAGS_CONFIG",
    });

    const config = {
      version: 1,
      active: {
        team: true,
        meetings: true,
        peer_assessment: true,
        peer_feedback: true,
        repos: true,
        trello: true,
        discussion: true,
        team_health: true,
      },
      completed: {
        team: true,
        meetings: true,
        peer_assessment: false,
        peer_feedback: false,
        repos: true,
        trello: true,
        discussion: true,
        team_health: true,
      },
      peerModes: {
        peer_assessment: "MANUAL" as const,
        peer_feedback: "NATURAL" as const,
      },
    };

    (repo.updateStaffProjectNavFlagsConfig as any).mockResolvedValueOnce({
      id: 3,
      name: "Project A",
      projectNavFlags: config,
      deadline: {
        assessmentOpenDate: new Date("2026-03-30T12:00:00.000Z"),
        feedbackOpenDate: new Date("2026-04-03T12:00:00.000Z"),
      },
    });

    await expect(updateProjectNavFlagsConfigForStaff(9, 3, config)).resolves.toEqual({
      id: 3,
      name: "Project A",
      hasPersistedProjectNavFlags: true,
      projectNavFlags: config,
      deadlineWindow: {
        assessmentOpenDate: new Date("2026-03-30T12:00:00.000Z"),
        feedbackOpenDate: new Date("2026-04-03T12:00:00.000Z"),
      },
    });

    expect(repo.updateStaffProjectNavFlagsConfig).toHaveBeenCalledWith(9, 3, config);
  });

  it("parseProjectWarningsConfig validates shape and getDefaultProjectWarningsConfig returns defaults", async () => {
    const defaults = getDefaultProjectWarningsConfig();
    expect(defaults.version).toBe(1);
    expect(defaults.rules.length).toBeGreaterThan(0);

    expect(parseProjectWarningsConfig(null)).toBeNull();
    expect(parseProjectWarningsConfig({ version: 2, rules: [] })).toBeNull();
    expect(
      parseProjectWarningsConfig({
        version: 1,
        rules: [{ key: "LOW_ATTENDANCE", enabled: true, severity: "HIGH", params: { minPercent: 30 } }],
      }),
    ).toEqual({
      version: 1,
      rules: [{ key: "LOW_ATTENDANCE", enabled: true, severity: "HIGH", params: { minPercent: 30 } }],
    });
  });

  it("fetchProjectWarningsConfigForStaff returns default config when missing/invalid", async () => {
    (repo.getStaffProjectWarningsConfig as any).mockResolvedValueOnce({
      id: 3,
      warningsConfig: null,
    });

    const result = await fetchProjectWarningsConfigForStaff(9, 3);
    expect(result).toEqual(
      expect.objectContaining({
        id: 3,
        hasPersistedWarningsConfig: false,
        warningsConfig: expect.objectContaining({ version: 1 }),
      }),
    );
  });

  it("updateProjectWarningsConfigForStaff validates config and delegates update", async () => {
    await expect(updateProjectWarningsConfigForStaff(9, 3, null)).rejects.toMatchObject({
      code: "INVALID_WARNINGS_CONFIG",
    });

    (repo.updateStaffProjectWarningsConfig as any).mockResolvedValueOnce({
      id: 3,
      warningsConfig: { version: 1, rules: [{ key: "LOW_ATTENDANCE", enabled: true }] },
    });

    await expect(
      updateProjectWarningsConfigForStaff(9, 3, {
        version: 1,
        rules: [{ key: "LOW_ATTENDANCE", enabled: true }],
      }),
    ).resolves.toEqual({
      id: 3,
      hasPersistedWarningsConfig: true,
      warningsConfig: { version: 1, rules: [{ key: "LOW_ATTENDANCE", enabled: true }] },
    });

    expect(repo.updateStaffProjectWarningsConfig).toHaveBeenCalledWith(
      9,
      3,
      expect.objectContaining({
        version: 1,
        rules: [{ key: "LOW_ATTENDANCE", enabled: true }],
      }),
    );
  });

  it("evaluateProjectWarningsForStaff creates and resolves auto warnings based on config", async () => {
    (repo.getStaffProjectWarningsConfig as any).mockResolvedValueOnce({
      id: 3,
      warningsConfig: {
        version: 1,
        rules: [
          { key: "LOW_ATTENDANCE", enabled: true, severity: "HIGH", params: { minPercent: 70, lookbackDays: 30 } },
          { key: "MEETING_FREQUENCY", enabled: true, severity: "MEDIUM", params: { minPerWeek: 1, lookbackDays: 28 } },
        ],
      },
    });
    (repo.getProjectTeamWarningSignals as any).mockResolvedValueOnce([
      {
        id: 11,
        teamName: "Alpha",
        meetings: [
          {
            date: new Date("2026-03-20T10:00:00.000Z"),
            attendances: [{ status: "Present" }, { status: "Absent" }],
          },
        ],
      },
    ]);
    (repo.getActiveAutoTeamWarningsForProject as any).mockResolvedValueOnce([
      {
        id: 81,
        teamId: 11,
        type: "MEETING_FREQUENCY",
        severity: "MEDIUM",
        title: "Meeting activity below recommendation",
        details: "0 meeting(s) logged over the last 28 days. Recommended minimum: 4.",
        createdAt: new Date("2026-03-20T00:00:00.000Z"),
      },
    ]);
    (repo.resolveTeamWarningById as any).mockResolvedValue({ id: 81 });
    (repo.updateAutoTeamWarningById as any).mockResolvedValue({ id: 81 });
    (repo.createTeamWarning as any).mockResolvedValue({ id: 99 });

    const summary = await evaluateProjectWarningsForStaff(9, 3);
    expect(summary).toEqual(
      expect.objectContaining({
        projectId: 3,
        evaluatedTeams: 1,
        createdWarnings: 1,
        refreshedWarnings: expect.any(Number),
        expiredWarnings: 0,
        resolvedWarnings: 0,
        activeAutoWarnings: 2,
      }),
    );
    expect(repo.createTeamWarning).toHaveBeenCalledWith(
      3,
      11,
      expect.objectContaining({
        type: "LOW_ATTENDANCE",
        source: "AUTO",
      }),
    );
  });

  it("evaluateProjectWarningsForStaff resolves active auto warnings when team improves", async () => {
    (repo.getStaffProjectWarningsConfig as any).mockResolvedValueOnce({
      id: 3,
      warningsConfig: {
        version: 1,
        rules: [
          { key: "MEETING_FREQUENCY", enabled: true, severity: "MEDIUM", params: { minPerWeek: 1, lookbackDays: 28 } },
        ],
      },
    });
    (repo.getProjectTeamWarningSignals as any).mockResolvedValueOnce([
      {
        id: 11,
        teamName: "Alpha",
        meetings: [
          { date: new Date("2026-03-18T10:00:00.000Z"), attendances: [] },
          { date: new Date("2026-03-19T10:00:00.000Z"), attendances: [] },
          { date: new Date("2026-03-20T10:00:00.000Z"), attendances: [] },
          { date: new Date("2026-03-21T10:00:00.000Z"), attendances: [] },
          { date: new Date("2026-03-22T10:00:00.000Z"), attendances: [] },
        ],
      },
    ]);
    (repo.getActiveAutoTeamWarningsForProject as any).mockResolvedValueOnce([
      {
        id: 81,
        teamId: 11,
        type: "MEETING_FREQUENCY",
        severity: "MEDIUM",
        title: "Meeting activity below recommendation",
        details: "0 meeting(s) logged over the last 28 days. Recommended minimum: 4.",
        createdAt: new Date("2026-03-20T00:00:00.000Z"),
      },
    ]);
    (repo.resolveTeamWarningById as any).mockResolvedValueOnce({ id: 81 });

    const summary = await evaluateProjectWarningsForStaff(9, 3);

    expect(summary).toEqual(
      expect.objectContaining({
        projectId: 3,
        evaluatedTeams: 1,
        createdWarnings: 0,
        resolvedWarnings: 1,
        activeAutoWarnings: 0,
      }),
    );
    expect(repo.resolveTeamWarningById).toHaveBeenCalledWith(81);
    expect(repo.createTeamWarning).not.toHaveBeenCalled();
  });

  it("notifies module leads when a team health message is submitted", async () => {
    (repo.getTeamByUserAndProject as any).mockResolvedValue({ id: 22 });
    (repo.createTeamHealthMessage as any).mockResolvedValue({ id: 101 });
    (repo.getModuleLeadsForProject as any).mockResolvedValue([{ userId: 10 }, { userId: 11 }]);

    await submitTeamHealthMessage(7, 3, "Need support", "Details");

    expect(notificationsService.addNotification).toHaveBeenCalledTimes(2);
    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 10, type: "TEAM_HEALTH_SUBMITTED" })
    );
    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 11, type: "TEAM_HEALTH_SUBMITTED" })
    );
  });

  it("does not notify when user is not in a team", async () => {
    (repo.getTeamByUserAndProject as any).mockResolvedValue(null);

    await submitTeamHealthMessage(7, 3, "Need support", "Details");

    expect(notificationsService.addNotification).not.toHaveBeenCalled();
  });

  it("notifies the student when a deadline override is granted", async () => {
    (repo.upsertStaffStudentDeadlineOverride as any).mockResolvedValue({ id: 55 });

    await upsertStaffStudentDeadlineOverride(1, 3, 9, { taskDueDate: new Date() });

    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 9, type: "DEADLINE_OVERRIDE_GRANTED" })
    );
  });
});
