import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getModulesForUserImpl,
  getStaffProjectsForMarkingImpl,
  getStaffProjectsImpl,
} from "./repo.highAuthorship.js";

describe("projects repo.highAuthorship", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty modules when user lookup fails", async () => {
    const result = await getModulesForUserImpl({
      userId: 10,
      options: {},
      prisma: { user: { findUnique: vi.fn().mockResolvedValue(null) } },
      parsePositiveIntegerSearchQuery: vi.fn(),
      buildModuleMembershipFilterForUser: vi.fn(),
      applyFuzzyFallback: vi.fn(),
      MODULE_LEAD_NAME_SELECT: {},
      MODULE_LIST_PROJECT_DEADLINE_SELECT: {},
      matchesModuleSearchQuery: vi.fn(),
      buildModuleLeadNames: vi.fn(),
      resolveModuleAccessRole: vi.fn(),
      aggregateModuleProjectDateWindow: vi.fn(),
      useStaffModuleStaffList: vi.fn(),
      moduleLeadAndTaSelect: vi.fn(),
      moduleAccessFlagsForUser: vi.fn(),
      countUniqueStaffOnModule: vi.fn(),
    });

    expect(result).toEqual([]);
  });

  it("builds compact module payloads with query filtering and fuzzy fallback hooks", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 1,
          code: "CS101",
          name: "SEGP",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          archivedAt: null,
          _count: { moduleLeads: 1, moduleTeachingAssistants: 1 },
          moduleLeads: [{ userId: 7, user: { firstName: "Ayan", lastName: "Mamun" } }],
          moduleTeachingAssistants: [{ userId: 9 }],
          userModules: [{ userId: 7 }],
          projects: [{ deadline: { taskDueDate: null } }],
        },
      ])
      .mockResolvedValueOnce([]);
    const applyFuzzyFallback = vi.fn(async (items: any[], options: any) => {
      await options.fetchFallbackCandidates(5);
      options.matches({ id: 1, name: "SEGP", code: "CS101" }, "segp");
      return items;
    });

    const result = await getModulesForUserImpl({
      userId: 7,
      options: { compact: true, staffOnly: true, query: " 42 " },
      prisma: {
        user: { findUnique: vi.fn().mockResolvedValue({ id: 7, role: "STAFF", enterpriseId: "ent-1" }) },
        module: { findMany },
      },
      parsePositiveIntegerSearchQuery: vi.fn().mockReturnValue(42),
      buildModuleMembershipFilterForUser: vi.fn().mockReturnValue({ enterpriseId: "ent-1" }),
      applyFuzzyFallback,
      MODULE_LEAD_NAME_SELECT: { user: { select: { firstName: true, lastName: true } } },
      MODULE_LIST_PROJECT_DEADLINE_SELECT: { taskDueDate: true },
      matchesModuleSearchQuery: vi.fn().mockReturnValue(true),
      buildModuleLeadNames: vi.fn().mockReturnValue("Ayan Mamun"),
      resolveModuleAccessRole: vi.fn().mockReturnValue("OWNER"),
      aggregateModuleProjectDateWindow: vi
        .fn()
        .mockReturnValue({ projectWindowStart: new Date("2026-01-10T00:00:00.000Z"), projectWindowEnd: null }),
      useStaffModuleStaffList: vi.fn(),
      moduleLeadAndTaSelect: vi.fn(),
      moduleAccessFlagsForUser: vi.fn(),
      countUniqueStaffOnModule: vi.fn(),
    });

    expect(result).toEqual([
      expect.objectContaining({
        id: 1,
        code: "CS101",
        name: "SEGP",
        moduleLeadNames: "Ayan Mamun",
        accessRole: "OWNER",
        leaderCount: 1,
        teachingAssistantCount: 1,
      }),
    ]);
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(applyFuzzyFallback).toHaveBeenCalledTimes(1);
  });

  it("builds full module payloads and includes optional staffWithAccessCount only when provided", async () => {
    const modules = [
      {
        id: 1,
        code: "M1",
        name: "Module One",
        briefText: "b1",
        timelineText: "t1",
        expectationsText: "e1",
        readinessNotesText: "r1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        archivedAt: null,
        _count: { moduleLeads: 1, moduleTeachingAssistants: 0 },
        moduleLeads: [{ userId: 7 }],
        moduleTeachingAssistants: [],
        userModules: [{ userId: 7 }],
        projects: [{ _count: { teams: 2 }, deadline: { taskDueDate: null } }],
      },
      {
        id: 2,
        code: "M2",
        name: "Module Two",
        briefText: null,
        timelineText: null,
        expectationsText: null,
        readinessNotesText: null,
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
        archivedAt: null,
        _count: { moduleLeads: 1, moduleTeachingAssistants: 1 },
        moduleLeads: [{ userId: 8 }],
        moduleTeachingAssistants: [{ userId: 7 }],
        userModules: [],
        projects: [{ _count: { teams: 1 }, deadline: { taskDueDate: null } }],
      },
    ];

    const result = await getModulesForUserImpl({
      userId: 7,
      options: { compact: false, query: null },
      prisma: {
        user: { findUnique: vi.fn().mockResolvedValue({ id: 7, role: "STAFF", enterpriseId: "ent-1" }) },
        module: { findMany: vi.fn().mockResolvedValue(modules) },
      },
      parsePositiveIntegerSearchQuery: vi.fn(),
      buildModuleMembershipFilterForUser: vi.fn().mockReturnValue({ enterpriseId: "ent-1" }),
      applyFuzzyFallback: vi.fn(async (items: any[], options: any) => {
        await options.fetchFallbackCandidates(4);
        options.matches({ id: 1, code: "M1", name: "Module One" }, "module");
        return items;
      }),
      MODULE_LEAD_NAME_SELECT: {},
      MODULE_LIST_PROJECT_DEADLINE_SELECT: {},
      matchesModuleSearchQuery: vi.fn().mockReturnValue(true),
      buildModuleLeadNames: vi.fn((leads: any[]) => (leads.length ? "Lead" : "")),
      resolveModuleAccessRole: vi.fn().mockReturnValue("STAFF"),
      aggregateModuleProjectDateWindow: vi.fn().mockReturnValue({ projectWindowStart: null, projectWindowEnd: null }),
      useStaffModuleStaffList: vi.fn().mockReturnValue("STAFF_ONLY"),
      moduleLeadAndTaSelect: vi.fn().mockReturnValue({
        moduleLeads: { select: { userId: true } },
        moduleTeachingAssistants: { select: { userId: true } },
      }),
      moduleAccessFlagsForUser: vi.fn().mockReturnValue({}),
      countUniqueStaffOnModule: vi.fn((module: { id: number }) => (module.id === 2 ? 4 : undefined)),
    });

    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 1,
        teamCount: 2,
        projectCount: 1,
      }),
    );
    expect(result[0]).not.toHaveProperty("staffWithAccessCount");
    expect(result[1]).toEqual(expect.objectContaining({ id: 2, staffWithAccessCount: 4 }));
  });

  it("builds staff project lists using scoped role filters and fuzzy fallback", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 11, name: "Project A", module: { name: "Module A" } }]);
    const applyFuzzyFallback = vi.fn(async (items: any[], options: any) => {
      await options.fetchFallbackCandidates(3);
      options.matches({ id: 11, name: "Project A", module: { name: "Module A" } }, "proj");
      return items;
    });

    const staffResult = await getStaffProjectsImpl({
      userId: 7,
      options: { query: " 7 ", moduleId: 22 },
      getScopedStaffUser: vi.fn().mockResolvedValue({ role: "STAFF", enterpriseId: "ent-1" }),
      parsePositiveIntegerSearchQuery: vi.fn().mockReturnValue(7),
      prisma: { project: { findMany } },
      STAFF_PROJECT_LIST_SELECT: { id: true, name: true },
      applyFuzzyFallback,
      matchesStaffProjectSearchQuery: vi.fn().mockReturnValue(true),
    });

    const adminResult = await getStaffProjectsImpl({
      userId: 8,
      options: { query: null },
      getScopedStaffUser: vi.fn().mockResolvedValue({ role: "ADMIN", enterpriseId: "ent-1" }),
      parsePositiveIntegerSearchQuery: vi.fn(),
      prisma: { project: { findMany } },
      STAFF_PROJECT_LIST_SELECT: { id: true },
      applyFuzzyFallback: vi.fn(async (items) => items),
      matchesStaffProjectSearchQuery: vi.fn().mockReturnValue(true),
    });

    expect(staffResult).toHaveLength(1);
    expect(adminResult).toHaveLength(1);
    expect(findMany).toHaveBeenCalled();
    expect(applyFuzzyFallback).toHaveBeenCalledTimes(1);
  });

  it("builds marking project lists and returns empty lists when user is unavailable", async () => {
    const noUser = await getStaffProjectsForMarkingImpl({
      userId: 9,
      options: { query: "x" },
      getScopedStaffUser: vi.fn().mockResolvedValue(null),
      parsePositiveIntegerSearchQuery: vi.fn(),
      prisma: { project: { findMany: vi.fn() } },
      MARKING_PROJECT_SELECT: { id: true },
      applyFuzzyFallback: vi.fn(),
      matchesMarkingProjectSearchQuery: vi.fn(),
    });
    expect(noUser).toEqual([]);

    const findMany = vi.fn().mockResolvedValue([{ id: 99, name: "Marking Project", teams: [] }]);
    const result = await getStaffProjectsForMarkingImpl({
      userId: 9,
      options: { query: " 99 " },
      getScopedStaffUser: vi.fn().mockResolvedValue({ role: "ENTERPRISE_ADMIN", enterpriseId: "ent-1" }),
      parsePositiveIntegerSearchQuery: vi.fn().mockReturnValue(99),
      prisma: { project: { findMany } },
      MARKING_PROJECT_SELECT: { id: true, teams: true },
      applyFuzzyFallback: vi.fn(async (items: any[], options: any) => {
        await options.fetchFallbackCandidates(2);
        options.matches({ id: 99, name: "Marking Project", module: { name: "M" }, teams: [] }, "99");
        return items;
      }),
      matchesMarkingProjectSearchQuery: vi.fn().mockReturnValue(true),
    });

    expect(result).toHaveLength(1);
    expect(findMany).toHaveBeenCalled();
  });

  it("applies non-admin marking access filters when query is absent", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 21, name: "Scoped Project", teams: [] }]);
    const result = await getStaffProjectsForMarkingImpl({
      userId: 12,
      options: { query: null },
      getScopedStaffUser: vi.fn().mockResolvedValue({ role: "STAFF", enterpriseId: "ent-1" }),
      parsePositiveIntegerSearchQuery: vi.fn(),
      prisma: { project: { findMany } },
      MARKING_PROJECT_SELECT: { id: true, teams: true },
      applyFuzzyFallback: vi.fn(async (items) => items),
      matchesMarkingProjectSearchQuery: vi.fn().mockReturnValue(true),
    });

    expect(result).toHaveLength(1);
    const whereArg = findMany.mock.calls[0]?.[0]?.where;
    expect(whereArg).toEqual(
      expect.objectContaining({
        AND: expect.any(Array),
      }),
    );
  });
});
