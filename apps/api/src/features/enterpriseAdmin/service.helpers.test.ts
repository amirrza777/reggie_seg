import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../../shared/db.js", () => ({ prisma: dbMocks.prisma }));

import {
  ensureCreatorLeader,
  getUtcStartOfDaysAgo,
  isEnterpriseAdminRole,
  normalizeFeatureFlagLabel,
  parseModulePayload,
  parsePositiveInt,
  parsePositiveIntArray,
  replaceModuleAssignments,
  sanitiseModuleStudentIdsForUpdate,
  validateAssignmentUsers,
} from "./service.helpers.js";

describe("enterpriseAdmin service.helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses a valid module payload", () => {
    const parsed = parseModulePayload({
      name: "  Module A ",
      briefText: "  Brief ",
      timelineText: "",
      expectationsText: null,
      readinessNotesText: " Notes ",
      leaderIds: [11, 11],
      taIds: [12],
      studentIds: [31, 31],
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        name: "Module A",
        briefText: "Brief",
        timelineText: null,
        expectationsText: null,
        readinessNotesText: "Notes",
        leaderIds: [11],
        taIds: [12],
        studentIds: [31],
      },
    });
  });

  it("rejects missing and oversized module names", () => {
    expect(parseModulePayload({})).toEqual({ ok: false, error: "Module name is required" });
    expect(parseModulePayload({ name: "a".repeat(121) })).toEqual({
      ok: false,
      error: "Module name must be 120 characters or fewer",
    });
  });

  it("rejects invalid optional text fields", () => {
    expect(parseModulePayload({ name: "X", briefText: 42 })).toEqual({
      ok: false,
      error: "Module brief must be a string",
    });

    expect(parseModulePayload({ name: "X", readinessNotesText: "a".repeat(8001) })).toEqual({
      ok: false,
      error: "Readiness notes must be 8000 characters or fewer",
    });
  });

  it("ensures creator is included as leader", () => {
    const creator = { id: 99 } as any;
    expect(ensureCreatorLeader([11], creator)).toEqual([11, 99]);
    expect(ensureCreatorLeader([99, 11], creator)).toEqual([99, 11]);
  });

  it("identifies enterprise admin roles", () => {
    expect(isEnterpriseAdminRole("ENTERPRISE_ADMIN")).toBe(true);
    expect(isEnterpriseAdminRole("ADMIN")).toBe(true);
    expect(isEnterpriseAdminRole("STAFF" as any)).toBe(false);
  });

  it("parses positive ints and arrays", () => {
    expect(parsePositiveInt("3")).toBe(3);
    expect(parsePositiveInt("0")).toBeNull();
    expect(parsePositiveInt("abc")).toBeNull();

    expect(parsePositiveIntArray("x", "ids")).toEqual({ ok: false, error: "ids must be an array" });
    expect(parsePositiveIntArray([1, "bad"], "ids")).toEqual({
      ok: false,
      error: "ids must contain positive integers",
    });
    expect(parsePositiveIntArray([1, 2, 2, 1], "ids")).toEqual({ ok: true, value: [1, 2] });
  });

  it("returns UTC start of day for days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-25T15:30:00.000Z"));

    expect(getUtcStartOfDaysAgo(0).toISOString()).toBe("2026-03-25T00:00:00.000Z");
    expect(getUtcStartOfDaysAgo(2).toISOString()).toBe("2026-03-23T00:00:00.000Z");

    vi.useRealTimers();
  });

  it("normalizes repos label only for the specific key/label pair", () => {
    expect(normalizeFeatureFlagLabel({ key: "repos", label: "Repos", enabled: true })).toEqual({
      key: "repos",
      label: "Repositories",
      enabled: true,
    });

    const unchanged = { key: "repos", label: "Repository", enabled: true };
    expect(normalizeFeatureFlagLabel(unchanged)).toBe(unchanged);
  });

  it("sanitises student ids by removing leaders/tas and non-students", async () => {
    dbMocks.prisma.user.findMany.mockResolvedValueOnce([{ id: 31 }, { id: 32 }]);

    const result = await sanitiseModuleStudentIdsForUpdate("ent-1", [31, 32, 33, 11, 12, 31], [11], [12]);

    expect(dbMocks.prisma.user.findMany).toHaveBeenCalledWith({
      where: { enterpriseId: "ent-1", id: { in: [31, 32, 33] }, role: "STUDENT" },
      select: { id: true },
    });
    expect(result).toEqual([31, 32]);
  });

  it("returns empty student ids when all candidates are filtered out before DB call", async () => {
    const result = await sanitiseModuleStudentIdsForUpdate("ent-1", [11, 12], [11], [12]);
    expect(result).toEqual([]);
    expect(dbMocks.prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("validates assignment users for all failure and success paths", async () => {
    expect(
      await validateAssignmentUsers({ enterpriseId: "ent-1", leaderIds: [], taIds: [], studentIds: [] }),
    ).toEqual({ ok: true });

    dbMocks.prisma.user.findMany.mockResolvedValueOnce([{ id: 11, role: "STAFF" }]);
    expect(
      await validateAssignmentUsers({ enterpriseId: "ent-1", leaderIds: [11], taIds: [12], studentIds: [] }),
    ).toEqual({ ok: false, error: "Some selected users do not belong to this enterprise" });

    dbMocks.prisma.user.findMany.mockResolvedValueOnce([{ id: 11, role: "STUDENT" }]);
    expect(
      await validateAssignmentUsers({ enterpriseId: "ent-1", leaderIds: [11], taIds: [], studentIds: [] }),
    ).toEqual({ ok: false, error: "Module leaders must be staff or admin accounts" });

    dbMocks.prisma.user.findMany.mockResolvedValueOnce([{ id: 11, role: "STAFF" }]);
    expect(
      await validateAssignmentUsers({ enterpriseId: "ent-1", leaderIds: [11], taIds: [12], studentIds: [] }),
    ).toEqual({ ok: false, error: "Some selected users do not belong to this enterprise" });

    dbMocks.prisma.user.findMany.mockResolvedValueOnce([
      { id: 11, role: "STAFF" },
      { id: 31, role: "STAFF" },
    ]);
    expect(
      await validateAssignmentUsers({ enterpriseId: "ent-1", leaderIds: [11], taIds: [], studentIds: [31] }),
    ).toEqual({ ok: false, error: "Student assignments can only include student accounts" });

    dbMocks.prisma.user.findMany.mockResolvedValueOnce([
      { id: 11, role: "STAFF" },
      { id: 12, role: "ENTERPRISE_ADMIN" },
      { id: 31, role: "STUDENT" },
    ]);
    expect(
      await validateAssignmentUsers({ enterpriseId: "ent-1", leaderIds: [11], taIds: [12], studentIds: [31] }),
    ).toEqual({ ok: true });
  });

  it("replaces module assignments with and without createMany inserts", async () => {
    const tx = {
      moduleLead: { deleteMany: vi.fn(), createMany: vi.fn() },
      moduleTeachingAssistant: { deleteMany: vi.fn(), createMany: vi.fn() },
      userModule: { deleteMany: vi.fn(), createMany: vi.fn() },
    } as any;

    await replaceModuleAssignments(tx, {
      enterpriseId: "ent-1",
      moduleId: 7,
      leaderIds: [11],
      taIds: [12],
      studentIds: [31],
    });

    expect(tx.moduleLead.deleteMany).toHaveBeenCalledWith({ where: { moduleId: 7 } });
    expect(tx.moduleTeachingAssistant.deleteMany).toHaveBeenCalledWith({ where: { moduleId: 7 } });
    expect(tx.userModule.deleteMany).toHaveBeenCalledWith({ where: { enterpriseId: "ent-1", moduleId: 7 } });
    expect(tx.moduleLead.createMany).toHaveBeenCalledWith({
      data: [{ moduleId: 7, userId: 11 }],
      skipDuplicates: true,
    });
    expect(tx.moduleTeachingAssistant.createMany).toHaveBeenCalledWith({
      data: [{ moduleId: 7, userId: 12 }],
      skipDuplicates: true,
    });
    expect(tx.userModule.createMany).toHaveBeenCalledWith({
      data: [{ enterpriseId: "ent-1", moduleId: 7, userId: 31 }],
      skipDuplicates: true,
    });

    vi.clearAllMocks();

    await replaceModuleAssignments(tx, {
      enterpriseId: "ent-1",
      moduleId: 7,
      leaderIds: [],
      taIds: [],
      studentIds: [],
    });

    expect(tx.moduleLead.createMany).not.toHaveBeenCalled();
    expect(tx.moduleTeachingAssistant.createMany).not.toHaveBeenCalled();
    expect(tx.userModule.createMany).not.toHaveBeenCalled();
  });
});
