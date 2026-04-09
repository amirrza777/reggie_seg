import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../shared/db.js";
import {
  createTeamWarning,
  getActiveAutoTeamWarningsForProject,
  getProjectTeamWarningSignals,
  getProjectWarningsSettings,
  getStaffProjectWarningsConfig,
  getTeamWarningsForTeamInProject,
  resolveTeamWarningById,
  updateAutoTeamWarningById,
  updateStaffProjectWarningsConfig,
} from "./repo.js";

vi.mock("../../../shared/db.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    team: {
      findMany: vi.fn(),
    },
    teamWarning: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("projects/warnings repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when actor user cannot be found", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);

    await expect(getStaffProjectWarningsConfig(999, 4)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "User not found",
    });
  });

  it("rejects when actor role is not staff/admin", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 9,
      role: "STUDENT",
      enterpriseId: "ent-1",
    });

    await expect(getStaffProjectWarningsConfig(9, 4)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("getStaffProjectWarningsConfig enforces scope and returns selected config", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 9,
      role: "ADMIN",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any).mockResolvedValueOnce({ id: 4 });
    (prisma.project.findUnique as any).mockResolvedValueOnce({
      id: 4,
      warningsConfig: { version: 1, rules: [] },
    });

    await expect(getStaffProjectWarningsConfig(9, 4)).resolves.toEqual({
      id: 4,
      warningsConfig: { version: 1, rules: [] },
    });
  });

  it("rejects with PROJECT_NOT_FOUND when project is outside actor enterprise scope", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 9,
      role: "ADMIN",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any).mockResolvedValueOnce(null);

    await expect(getStaffProjectWarningsConfig(9, 404)).rejects.toMatchObject({
      code: "PROJECT_NOT_FOUND",
    });
  });

  it("updateStaffProjectWarningsConfig enforces lead access for staff", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 9,
      role: "STAFF",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 4 })
      .mockResolvedValueOnce(null);

    await expect(updateStaffProjectWarningsConfig(9, 4, { version: 1, rules: [] })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("updateStaffProjectWarningsConfig updates the scoped project config", async () => {
    const config = { version: 1, rules: [{ key: "LOW_ATTENDANCE", enabled: true }] };
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 12,
      role: "STAFF",
      enterpriseId: "ent-1",
    });
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce({ id: 4 })
      .mockResolvedValueOnce({ id: 4 });
    (prisma.project.findUnique as any).mockResolvedValueOnce({
      archivedAt: null,
      module: { archivedAt: null },
    });
    (prisma.project.update as any).mockResolvedValueOnce({
      id: 4,
      warningsConfig: config,
    });

    await updateStaffProjectWarningsConfig(12, 4, config);
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 4 },
        data: { warningsConfig: config },
      }),
    );
  });

  it("getProjectWarningsSettings fetches id and warnings config by project id", async () => {
    await getProjectWarningsSettings(3);
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: 3 },
      select: {
        id: true,
        warningsConfig: true,
      },
    });
  });

  it("getProjectTeamWarningSignals aggregates commits and filters by team members", async () => {
    (prisma.team.findMany as any).mockResolvedValueOnce([
      {
        id: 6,
        teamName: "Alpha",
        allocations: [{ userId: 10 }, { userId: 11 }],
        meetings: [{ date: new Date("2026-03-01T10:00:00.000Z"), attendances: [{ status: "ATTENDED" }] }],
        project: {
          githubRepositories: [
            {
              snapshots: [
                {
                  userStats: [
                    { mappedUserId: 10, commits: 3, commitsByDay: { "2026-03-01": 2, "2026-03-02": 1 } },
                    { mappedUserId: 99, commits: 10, commitsByDay: { "2026-03-01": 10 } },
                    { mappedUserId: 11, commits: 2, commitsByDay: { "2026-03-02": 2 } },
                  ],
                },
              ],
            },
          ],
        },
      },
    ]);

    const signals = await getProjectTeamWarningSignals(3, new Date("2026-02-01T00:00:00.000Z"));
    expect(signals).toEqual([
      expect.objectContaining({
        id: 6,
        teamName: "Alpha",
        totalCommits: 5,
        commitsByDay: {
          "2026-03-01": 2,
          "2026-03-02": 3,
        },
      }),
    ]);
  });

  it("getProjectTeamWarningSignals handles invalid commitsByDay maps gracefully", async () => {
    (prisma.team.findMany as any).mockResolvedValueOnce([
      {
        id: 6,
        teamName: "Alpha",
        allocations: [{ userId: 10 }],
        meetings: [],
        project: {
          githubRepositories: [
            {
              snapshots: [
                {
                  userStats: [{ mappedUserId: 10, commits: 3, commitsByDay: null }],
                },
              ],
            },
          ],
        },
      },
    ]);

    const signals = await getProjectTeamWarningSignals(3, new Date("2026-02-01T00:00:00.000Z"));
    expect(signals).toEqual([
      expect.objectContaining({
        totalCommits: 3,
        commitsByDay: {},
      }),
    ]);
  });

  it("getProjectTeamWarningSignals skips non-finite day values and empty snapshots", async () => {
    (prisma.team.findMany as any).mockResolvedValueOnce([
      {
        id: 7,
        teamName: "Beta",
        allocations: [{ userId: 12 }],
        meetings: [],
        project: {
          githubRepositories: [
            { snapshots: [] },
            {
              snapshots: [
                {
                  userStats: [
                    {
                      mappedUserId: 12,
                      commits: 4,
                      commitsByDay: { "2026-03-05": "NaN", "2026-03-06": 2 },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ]);

    const signals = await getProjectTeamWarningSignals(5, new Date("2026-03-01T00:00:00.000Z"));
    expect(signals).toEqual([
      expect.objectContaining({
        totalCommits: 4,
        commitsByDay: { "2026-03-06": 2 },
      }),
    ]);
  });

  it("team warning CRUD helpers call prisma with expected scope filters", async () => {
    await getActiveAutoTeamWarningsForProject(8);
    expect(prisma.teamWarning.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 8, source: "AUTO", active: true },
      }),
    );

    await resolveTeamWarningById(5);
    expect(prisma.teamWarning.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ active: false, resolvedAt: expect.any(Date) }),
      }),
    );

    await updateAutoTeamWarningById(5, { severity: "HIGH", title: "T", details: "D" });
    expect(prisma.teamWarning.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: { severity: "HIGH", title: "T", details: "D" },
      }),
    );
  });

  it("createTeamWarning and getTeamWarningsForTeamInProject support default source and activeOnly filter", async () => {
    await createTeamWarning(1, 2, {
      type: "LOW_ATTENDANCE",
      severity: "HIGH",
      title: "Warning",
      details: "Details",
    });
    expect(prisma.teamWarning.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 1,
          teamId: 2,
          source: "MANUAL",
          createdByUserId: null,
        }),
      }),
    );

    await getTeamWarningsForTeamInProject(1, 2, { activeOnly: true });
    expect(prisma.teamWarning.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: 1,
          teamId: 2,
          active: true,
        }),
      }),
    );

    await getTeamWarningsForTeamInProject(1, 2);
    expect(prisma.teamWarning.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          projectId: 1,
          teamId: 2,
        },
      }),
    );
  });
});
