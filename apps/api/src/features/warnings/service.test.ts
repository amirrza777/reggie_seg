import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTeamWarningForStaff,
  evaluateProjectWarningsForAllProjects,
  evaluateProjectWarningsForStaff,
  fetchMyTeamWarnings,
  fetchProjectWarningsConfigForStaff,
  fetchTeamWarningsForStaff,
  getDefaultProjectWarningsConfig,
  parseProjectWarningsConfig,
  resolveTeamWarningForStaff,
  updateProjectWarningsConfigForStaff,
} from "./service.js";
import * as repo from "./repo.js";
import * as projectRepo from "../projects/repo.js";
import * as teamHealthRepo from "../team-health-review/repo.js";
import { prisma } from "../../shared/db.js";

vi.mock("./repo.js", () => ({
  getStaffProjectWarningsConfig: vi.fn(),
  getProjectWarningsSettings: vi.fn(),
  getProjectTeamWarningSignals: vi.fn(),
  getActiveAutoTeamWarningsForProject: vi.fn(),
  resolveTeamWarningById: vi.fn(),
  updateAutoTeamWarningById: vi.fn(),
  createTeamWarning: vi.fn(),
  getTeamWarningsForTeamInProject: vi.fn(),
  updateStaffProjectWarningsConfig: vi.fn(),
}));

vi.mock("../projects/repo.js", () => ({
  getTeamByUserAndProject: vi.fn(),
  getTeamById: vi.fn(),
}));

vi.mock("../team-health-review/repo.js", () => ({
  canStaffAccessTeamInProject: vi.fn(),
}));

vi.mock("../notifications/service.js", () => ({
  addNotification: vi.fn(),
}));

vi.mock("../../shared/projectWriteGuard.js", () => ({
  assertProjectMutableForWritesByProjectId: vi.fn().mockResolvedValue(undefined),
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
          createdAt: new Date("2020-01-01T00:00:00.000Z"),
          deadline: { taskOpenDate: null, assessmentDueDate: null, assessmentDueDateMcf: null },
          module: { archivedAt: null },
        }),
        findMany: vi.fn(),
      },
    },
  };
});

describe("projects/warnings service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createTeamWarningForStaff requires staff access", async () => {
    (teamHealthRepo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(false);
    await expect(
      createTeamWarningForStaff(9, 3, 22, {
        type: "LOW_ATTENDANCE",
        severity: "HIGH",
        title: "Attendance is low",
        details: "Less than 70% attendance in last 30 days.",
      }),
    ).resolves.toBeNull();
    expect(repo.createTeamWarning).not.toHaveBeenCalled();

    (teamHealthRepo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
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
    (teamHealthRepo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(false);
    await expect(fetchTeamWarningsForStaff(9, 3, 22)).resolves.toBeNull();
    expect(repo.getTeamWarningsForTeamInProject).not.toHaveBeenCalled();

    (teamHealthRepo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.getTeamWarningsForTeamInProject as any).mockResolvedValueOnce([{ id: 2 }]);
    await expect(fetchTeamWarningsForStaff(9, 3, 22)).resolves.toEqual([{ id: 2 }]);
    expect(repo.getTeamWarningsForTeamInProject).toHaveBeenCalledWith(3, 22);
  });

  it("resolveTeamWarningForStaff enforces scope and resolves only active warnings in team", async () => {
    (teamHealthRepo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(false);
    await expect(resolveTeamWarningForStaff(9, 3, 22, 80)).resolves.toBeNull();
    expect(repo.getTeamWarningsForTeamInProject).not.toHaveBeenCalled();
    expect(repo.resolveTeamWarningById).not.toHaveBeenCalled();

    (teamHealthRepo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.getTeamWarningsForTeamInProject as any).mockResolvedValueOnce([{ id: 81 }, { id: 82 }]);
    await expect(resolveTeamWarningForStaff(9, 3, 22, 80)).resolves.toBeNull();
    expect(repo.resolveTeamWarningById).not.toHaveBeenCalled();

    (teamHealthRepo.canStaffAccessTeamInProject as any).mockResolvedValueOnce(true);
    (repo.getTeamWarningsForTeamInProject as any).mockResolvedValueOnce([{ id: 80 }, { id: 81 }]);
    (repo.resolveTeamWarningById as any).mockResolvedValueOnce({ id: 80, active: false });
    await expect(resolveTeamWarningForStaff(9, 3, 22, 80)).resolves.toEqual({ id: 80, active: false });
    expect(repo.getTeamWarningsForTeamInProject).toHaveBeenCalledWith(3, 22, { activeOnly: true });
    expect(repo.resolveTeamWarningById).toHaveBeenCalledWith(80);
  });

  it("fetchMyTeamWarnings returns active warnings for current team", async () => {
    (projectRepo.getTeamByUserAndProject as any).mockResolvedValueOnce(null);
    await expect(fetchMyTeamWarnings(7, 3)).resolves.toBeNull();
    expect(repo.getTeamWarningsForTeamInProject).not.toHaveBeenCalled();

    (projectRepo.getTeamByUserAndProject as any).mockResolvedValueOnce({ id: 22 });
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

  it("evaluateProjectWarningsForStaff enforces hard grace period per rule using project start date", async () => {
    const now = new Date();
    const recentProjectStart = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    (prisma.project.findUnique as any).mockResolvedValueOnce({
      archivedAt: null,
      createdAt: recentProjectStart,
      deadline: { taskOpenDate: recentProjectStart, assessmentDueDate: null, assessmentDueDateMcf: null },
      module: { archivedAt: null },
    });
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
        meetings: [],
      },
    ]);
    (repo.getActiveAutoTeamWarningsForProject as any).mockResolvedValueOnce([]);

    const summary = await evaluateProjectWarningsForStaff(9, 3);

    expect(summary).toEqual(
      expect.objectContaining({
        projectId: 3,
        evaluatedTeams: 1,
        createdWarnings: 0,
        activeAutoWarnings: 0,
      }),
    );
    expect(repo.createTeamWarning).not.toHaveBeenCalled();
  });

  it("evaluateProjectWarningsForStaff stops tracking after peer assessment deadline and resolves active auto warnings", async () => {
    const endedAssessment = new Date(Date.now() - 24 * 60 * 60 * 1000);
    (prisma.project.findUnique as any).mockResolvedValueOnce({
      archivedAt: null,
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      deadline: { taskOpenDate: new Date("2020-01-01T00:00:00.000Z"), assessmentDueDate: endedAssessment, assessmentDueDateMcf: null },
      module: { archivedAt: null },
    });
    (repo.getStaffProjectWarningsConfig as any).mockResolvedValueOnce({
      id: 3,
      warningsConfig: {
        version: 1,
        rules: [
          { key: "MEETING_FREQUENCY", enabled: true, severity: "MEDIUM", params: { minPerWeek: 1, lookbackDays: 28 } },
        ],
      },
    });
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
        evaluatedTeams: 0,
        createdWarnings: 0,
        resolvedWarnings: 1,
        activeAutoWarnings: 0,
      }),
    );
    expect(repo.getProjectTeamWarningSignals).not.toHaveBeenCalled();
    expect(repo.createTeamWarning).not.toHaveBeenCalled();
    expect(repo.resolveTeamWarningById).toHaveBeenCalledWith(81);
  });

  it("evaluateProjectWarningsForAllProjects sweeps active projects and continues when one fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    (prisma.project.findMany as any).mockResolvedValueOnce([{ id: 3 }, { id: 4 }, { id: 5 }]);
    (repo.getProjectWarningsSettings as any)
      .mockResolvedValueOnce({ id: 3, warningsConfig: { version: 1, rules: [] } })
      .mockRejectedValueOnce(new Error("db exploded"))
      .mockResolvedValueOnce({ id: 5, warningsConfig: { version: 1, rules: [] } });
    (repo.getActiveAutoTeamWarningsForProject as any).mockResolvedValue([]);

    const summaries = await evaluateProjectWarningsForAllProjects();

    expect(repo.getProjectWarningsSettings).toHaveBeenNthCalledWith(1, 3);
    expect(repo.getProjectWarningsSettings).toHaveBeenNthCalledWith(2, 4);
    expect(repo.getProjectWarningsSettings).toHaveBeenNthCalledWith(3, 5);
    expect(summaries.map((summary) => summary.projectId)).toEqual([3, 5]);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Project warnings evaluation failed for project 4:", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
