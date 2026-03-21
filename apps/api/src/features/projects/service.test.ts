import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProject,
  fetchModulesForUser,
  fetchProjectById,
  fetchProjectDeadline,
  fetchProjectsForUser,
  fetchQuestionsForProject,
  fetchTeamById,
  fetchTeamByUserAndProject,
  fetchTeammatesForProject,
  submitTeamHealthMessage,
  fetchMyTeamHealthMessages,
  fetchTeamHealthMessagesForStaff,
  createTeamWarningForStaff,
  fetchTeamWarningsForStaff,
  fetchMyTeamWarnings,
  updateProjectWarningsEnabledForStaff,
  fetchProjectWarningsConfigForStaff,
  updateProjectWarningsConfigForStaff,
  evaluateProjectWarningsForStaff,
  getDefaultProjectWarningsConfig,
  parseProjectWarningsConfig,
} from "./service.js";
import * as repo from "./repo.js";

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
  createTeamHealthMessage: vi.fn(),
  getTeamHealthMessagesForUserInProject: vi.fn(),
  getTeamHealthMessagesForTeamInProject: vi.fn(),
  getProjectWarningsEnabledForTeam: vi.fn(),
  createTeamWarning: vi.fn(),
  getTeamWarningsForTeamInProject: vi.fn(),
  canStaffAccessTeamInProject: vi.fn(),
  updateStaffProjectWarningsEnabled: vi.fn(),
  getStaffProjectWarningsConfig: vi.fn(),
  updateStaffProjectWarningsConfig: vi.fn(),
  getProjectWarningsSettings: vi.fn(),
  getProjectTeamWarningSignals: vi.fn(),
  getActiveAutoTeamWarningsForProject: vi.fn(),
  resolveTeamWarningById: vi.fn(),
}));

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
    (repo.getProjectById as any).mockResolvedValue({ id: 9 });

    await expect(createProject(7, "P1", 2, 3, deadlineInput)).resolves.toEqual({ id: 9 });
    expect(repo.createProject).toHaveBeenCalledWith(7, "P1", 2, 3, deadlineInput);

    await expect(fetchProjectById(9)).resolves.toEqual({ id: 9 });
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
    (repo.getModulesForUser as any).mockResolvedValue([
      {
        id: 9,
        name: "SEGP",
        briefText: null,
        timelineText: "Timeline",
        expectationsText: null,
        readinessNotesText: null,
        teamCount: 5,
        projectCount: 2,
        accessRole: "OWNER",
      },
    ]);

    await expect(fetchModulesForUser(7, { staffOnly: true, compact: true })).resolves.toEqual([
      {
        id: "9",
        title: "SEGP",
        briefText: undefined,
        timelineText: "Timeline",
        expectationsText: undefined,
        readinessNotesText: undefined,
        teamCount: 5,
        projectCount: 2,
        accountRole: "OWNER",
      },
    ]);
  });

  it("fetchModulesForUser forwards module scope options to repo", async () => {
    (repo.getModulesForUser as any).mockResolvedValue([]);
    await fetchModulesForUser(7, { staffOnly: true, compact: true });
    expect(repo.getModulesForUser).toHaveBeenCalledWith(7, { staffOnly: true, compact: true });
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

  it("submitTeamHealthMessage validates membership and creates request", async () => {
    (repo.getTeamByUserAndProject as any).mockResolvedValueOnce(null);
    await expect(submitTeamHealthMessage(7, 3, "Need support", "Please review")).resolves.toBeNull();
    expect(repo.createTeamHealthMessage).not.toHaveBeenCalled();

    (repo.getTeamByUserAndProject as any).mockResolvedValueOnce({ id: 22 });
    (repo.createTeamHealthMessage as any).mockResolvedValue({ id: 101, resolved: false });
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

  it("updateProjectWarningsEnabledForStaff delegates to repo", async () => {
    (repo.updateStaffProjectWarningsEnabled as any).mockResolvedValue({ id: 3, warningsEnabled: true });
    await expect(updateProjectWarningsEnabledForStaff(9, 3, true)).resolves.toEqual({
      id: 3,
      warningsEnabled: true,
    });
    expect(repo.updateStaffProjectWarningsEnabled).toHaveBeenCalledWith(9, 3, true);
  });

  it("createTeamWarningForStaff requires staff access and warnings enabled", async () => {
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
    (repo.getProjectWarningsEnabledForTeam as any).mockResolvedValueOnce(false);
    await expect(
      createTeamWarningForStaff(9, 3, 22, {
        type: "LOW_ATTENDANCE",
        severity: "HIGH",
        title: "Attendance is low",
        details: "Less than 70% attendance in last 30 days.",
      }),
    ).rejects.toMatchObject({ code: "WARNINGS_DISABLED" });

    (repo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.getProjectWarningsEnabledForTeam as any).mockResolvedValueOnce(true);
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

  it("fetchMyTeamWarnings returns active warnings only when feature is enabled", async () => {
    (repo.getTeamByUserAndProject as any).mockResolvedValueOnce(null);
    await expect(fetchMyTeamWarnings(7, 3)).resolves.toBeNull();
    expect(repo.getTeamWarningsForTeamInProject).not.toHaveBeenCalled();

    (repo.getTeamByUserAndProject as any).mockResolvedValueOnce({ id: 22 });
    (repo.getProjectWarningsEnabledForTeam as any).mockResolvedValueOnce(false);
    await expect(fetchMyTeamWarnings(7, 3)).resolves.toEqual([]);

    (repo.getTeamByUserAndProject as any).mockResolvedValueOnce({ id: 22 });
    (repo.getProjectWarningsEnabledForTeam as any).mockResolvedValueOnce(true);
    (repo.getTeamWarningsForTeamInProject as any).mockResolvedValueOnce([{ id: 5, active: true }]);
    await expect(fetchMyTeamWarnings(7, 3)).resolves.toEqual([{ id: 5, active: true }]);
    expect(repo.getTeamWarningsForTeamInProject).toHaveBeenCalledWith(3, 22, { activeOnly: true });
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
      warningsEnabled: true,
      warningsConfig: null,
    });

    const result = await fetchProjectWarningsConfigForStaff(9, 3);
    expect(result).toEqual(
      expect.objectContaining({
        id: 3,
        warningsEnabled: true,
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
      warningsEnabled: true,
      warningsConfig: { version: 1, rules: [{ key: "LOW_ATTENDANCE", enabled: true }] },
    });

    await expect(
      updateProjectWarningsConfigForStaff(9, 3, {
        version: 1,
        rules: [{ key: "LOW_ATTENDANCE", enabled: true }],
      }),
    ).resolves.toEqual({
      id: 3,
      warningsEnabled: true,
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
      warningsEnabled: true,
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
      { id: 81, teamId: 11, type: "MEETING_FREQUENCY" },
    ]);
    (repo.resolveTeamWarningById as any).mockResolvedValue({ id: 81 });
    (repo.createTeamWarning as any).mockResolvedValue({ id: 99 });

    const summary = await evaluateProjectWarningsForStaff(9, 3);
    expect(summary).toEqual(
      expect.objectContaining({
        projectId: 3,
        warningsEnabled: true,
        evaluatedTeams: 1,
        createdWarnings: 1,
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
});
