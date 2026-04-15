import type { Prisma } from "@prisma/client";

type GetModulesForUserDeps = {
  userId: number;
  options?: { staffOnly?: boolean; compact?: boolean; query?: string | null };
  prisma: any;
  parsePositiveIntegerSearchQuery: (query: string) => number | null;
  buildModuleMembershipFilterForUser: (user: any, staffOnly: boolean) => Prisma.ModuleWhereInput;
  applyFuzzyFallback: <T>(
    initialItems: T[],
    options: {
      query: string;
      fetchFallbackCandidates: (limit: number) => Promise<T[]>;
      matches: (item: T, query: string) => boolean;
      limit?: number;
    },
  ) => Promise<T[]>;
  MODULE_LEAD_NAME_SELECT: any;
  MODULE_LIST_PROJECT_DEADLINE_SELECT: any;
  matchesModuleSearchQuery: (module: { id: number; code?: string | null; name: string }, query: string) => boolean;
  buildModuleLeadNames: (leads: any[]) => string;
  resolveModuleAccessRole: (role: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN", flags: any) => any;
  aggregateModuleProjectDateWindow: (projects: any[]) => { projectWindowStart: Date | null; projectWindowEnd: Date | null };
  useStaffModuleStaffList: (options?: { staffOnly?: boolean; compact?: boolean; query?: string | null }) => any;
  moduleLeadAndTaSelect: (user: any, mode: any) => any;
  moduleAccessFlagsForUser: (module: any, userId: number, mode: any) => any;
  countUniqueStaffOnModule: (module: any, mode: any) => number | undefined;
};

export async function getModulesForUserImpl({
  userId,
  options,
  prisma,
  parsePositiveIntegerSearchQuery,
  buildModuleMembershipFilterForUser,
  applyFuzzyFallback,
  MODULE_LEAD_NAME_SELECT,
  MODULE_LIST_PROJECT_DEADLINE_SELECT,
  matchesModuleSearchQuery,
  buildModuleLeadNames,
  resolveModuleAccessRole,
  aggregateModuleProjectDateWindow,
  useStaffModuleStaffList,
  moduleLeadAndTaSelect,
  moduleAccessFlagsForUser,
  countUniqueStaffOnModule,
}: GetModulesForUserDeps) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });

  if (!user) {
    return [];
  }

  const membershipFilter = buildModuleMembershipFilterForUser(user, options?.staffOnly === true);

  const normalizedQuery = typeof options?.query === "string" ? options.query.trim() : "";
  const hasQuery = normalizedQuery.length > 0;
  const numericQuery = hasQuery ? parsePositiveIntegerSearchQuery(normalizedQuery) : null;
  const searchFilter: Prisma.ModuleWhereInput | null = hasQuery
    ? {
        OR: [
          { name: { contains: normalizedQuery } },
          ...(numericQuery !== null ? [{ id: numericQuery }] : []),
        ],
      }
    : null;

  const scopedMembershipFilter: Prisma.ModuleWhereInput = searchFilter
    ? {
        AND: [membershipFilter, searchFilter],
      }
    : membershipFilter;

  if (options?.compact) {
    let compactModules = await prisma.module.findMany({
      where: scopedMembershipFilter,
      select: {
        id: true,
        code: true,
        name: true,
        createdAt: true,
        archivedAt: true,
        _count: {
          select: {
            moduleLeads: true,
            moduleTeachingAssistants: true,
          },
        },
        moduleLeads: {
          select: MODULE_LEAD_NAME_SELECT,
        },
        moduleTeachingAssistants: {
          where: { userId: user.id },
          select: { userId: true },
          take: 1,
        },
        userModules: {
          where: { userId: user.id, enterpriseId: user.enterpriseId },
          select: { userId: true },
          take: 1,
        },
        projects: {
          select: {
            deadline: { select: MODULE_LIST_PROJECT_DEADLINE_SELECT },
          },
        },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    compactModules = await applyFuzzyFallback(compactModules, {
      query: normalizedQuery,
      fetchFallbackCandidates: async (limit) =>
        prisma.module.findMany({
          where: membershipFilter,
          select: {
            id: true,
            code: true,
            name: true,
            createdAt: true,
            archivedAt: true,
            _count: {
              select: {
                moduleLeads: true,
                moduleTeachingAssistants: true,
              },
            },
            moduleLeads: {
              select: MODULE_LEAD_NAME_SELECT,
            },
            moduleTeachingAssistants: {
              where: { userId: user.id },
              select: { userId: true },
              take: 1,
            },
            userModules: {
              where: { userId: user.id, enterpriseId: user.enterpriseId },
              select: { userId: true },
              take: 1,
            },
            projects: {
              select: {
                deadline: { select: MODULE_LIST_PROJECT_DEADLINE_SELECT },
              },
            },
          },
          orderBy: [{ name: "asc" }, { id: "asc" }],
          take: limit,
        }),
      matches: (module, query) => matchesModuleSearchQuery(module, query),
    });

    return compactModules.map((module: any) => {
      const moduleLeadNames = buildModuleLeadNames(module.moduleLeads);
      const accessRole = resolveModuleAccessRole(user.role, {
        isOwner: module.moduleLeads.some((lead: any) => lead.userId === user.id),
        isTeachingAssistant: module.moduleTeachingAssistants.length > 0,
        isEnrolled: module.userModules.length > 0,
      });
      const { projectWindowStart, projectWindowEnd } = aggregateModuleProjectDateWindow(module.projects);

      return {
        id: module.id,
        code: module.code,
        name: module.name,
        moduleLeadNames,
        accessRole,
        leaderCount: module._count.moduleLeads,
        teachingAssistantCount: module._count.moduleTeachingAssistants,
        createdAt: module.createdAt,
        archivedAt: module.archivedAt,
        projectWindowStart,
        projectWindowEnd,
      };
    });
  }

  const listMode = useStaffModuleStaffList(options);
  const leadTaSelect = moduleLeadAndTaSelect(user, listMode);

  let modules = await prisma.module.findMany({
    where: scopedMembershipFilter,
    select: {
      id: true,
      code: true,
      name: true,
      briefText: true,
      expectationsText: true,
      readinessNotesText: true,
      createdAt: true,
      archivedAt: true,
      _count: {
        select: {
          moduleLeads: true,
          moduleTeachingAssistants: true,
        },
      },
      ...leadTaSelect,
      userModules: {
        where: { userId: user.id, enterpriseId: user.enterpriseId },
        select: { userId: true },
        take: 1,
      },
      projects: {
        select: {
          _count: {
            select: {
              teams: true,
            },
          },
          deadline: { select: MODULE_LIST_PROJECT_DEADLINE_SELECT },
        },
      },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  modules = await applyFuzzyFallback(modules, {
    query: normalizedQuery,
    fetchFallbackCandidates: async (limit) =>
      prisma.module.findMany({
        where: membershipFilter,
        select: {
          id: true,
          code: true,
          name: true,
          briefText: true,
          expectationsText: true,
          readinessNotesText: true,
          createdAt: true,
          archivedAt: true,
          _count: {
            select: {
              moduleLeads: true,
              moduleTeachingAssistants: true,
            },
          },
          ...leadTaSelect,
          userModules: {
            where: { userId: user.id, enterpriseId: user.enterpriseId },
            select: { userId: true },
            take: 1,
          },
          projects: {
            select: {
              _count: {
                select: {
                  teams: true,
                },
              },
              deadline: { select: MODULE_LIST_PROJECT_DEADLINE_SELECT },
            },
          },
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: limit,
      }),
    matches: (module, query) => matchesModuleSearchQuery(module, query),
  });

  return modules.map((module: any) => {
    const moduleLeadNames = buildModuleLeadNames(module.moduleLeads);
    const accessRole = resolveModuleAccessRole(
      user.role,
      moduleAccessFlagsForUser(module, user.id, listMode),
    );
    const staffWithAccessCount = countUniqueStaffOnModule(module, listMode);
    const { projectWindowStart, projectWindowEnd } = aggregateModuleProjectDateWindow(module.projects);

    return {
      id: module.id,
      code: module.code,
      name: module.name,
      briefText: module.briefText,
      expectationsText: module.expectationsText,
      readinessNotesText: module.readinessNotesText,
      moduleLeadNames,
      leaderCount: module._count.moduleLeads,
      teachingAssistantCount: module._count.moduleTeachingAssistants,
      createdAt: module.createdAt,
      archivedAt: module.archivedAt,
      projectWindowStart,
      projectWindowEnd,
      teamCount: module.projects.reduce((sum: number, project: any) => sum + project._count.teams, 0),
      projectCount: module.projects.length,
      accessRole,
      ...(staffWithAccessCount !== undefined ? { staffWithAccessCount } : {}),
    };
  });
}

type StaffProjectDeps = {
  userId: number;
  options?: { query?: string | null; moduleId?: number };
  getScopedStaffUser: (userId: number) => Promise<any>;
  parsePositiveIntegerSearchQuery: (query: string) => number | null;
  prisma: any;
  STAFF_PROJECT_LIST_SELECT: any;
  applyFuzzyFallback: <T>(
    initialItems: T[],
    options: {
      query: string;
      fetchFallbackCandidates: (limit: number) => Promise<T[]>;
      matches: (item: T, query: string) => boolean;
      limit?: number;
    },
  ) => Promise<T[]>;
  matchesStaffProjectSearchQuery: (project: { id: number; name: string; module: { name: string } | null }, query: string) => boolean;
};

export async function getStaffProjectsImpl({
  userId,
  options,
  getScopedStaffUser,
  parsePositiveIntegerSearchQuery,
  prisma,
  STAFF_PROJECT_LIST_SELECT,
  applyFuzzyFallback,
  matchesStaffProjectSearchQuery,
}: StaffProjectDeps) {
  const user = await getScopedStaffUser(userId);
  if (!user) return [];

  const baseWhere: Prisma.ProjectWhereInput = {
    module: {
      enterpriseId: user.enterpriseId,
      ...(options?.moduleId != null ? { id: options.moduleId } : {}),
    },
  };

  const where: Prisma.ProjectWhereInput =
    user.role === "ADMIN" || user.role === "ENTERPRISE_ADMIN"
      ? baseWhere
      : {
          AND: [
            baseWhere,
            {
              OR: [
                { module: { moduleLeads: { some: { userId } } } },
                { module: { moduleTeachingAssistants: { some: { userId } } } },
              ],
            },
          ],
        };

  const normalizedQuery = typeof options?.query === "string" ? options.query.trim() : "";
  const hasQuery = normalizedQuery.length > 0;
  const numericQuery = hasQuery ? parsePositiveIntegerSearchQuery(normalizedQuery) : null;
  const scopedWhere: Prisma.ProjectWhereInput = hasQuery
    ? {
        AND: [
          where,
          {
            OR: [
              { name: { contains: normalizedQuery } },
              { module: { name: { contains: normalizedQuery } } },
              ...(numericQuery !== null ? [{ id: numericQuery }] : []),
            ],
          },
        ],
      }
    : where;

  let projects = await prisma.project.findMany({
    where: scopedWhere,
    orderBy: { id: "asc" },
    select: STAFF_PROJECT_LIST_SELECT,
  });
  projects = await applyFuzzyFallback(projects, {
    query: normalizedQuery,
    fetchFallbackCandidates: async (limit) =>
      prisma.project.findMany({
        where,
        orderBy: { id: "asc" },
        select: STAFF_PROJECT_LIST_SELECT,
        take: limit,
      }),
    matches: (project, query) => matchesStaffProjectSearchQuery(project, query),
  });
  return projects;
}

type StaffProjectMarkingDeps = {
  userId: number;
  options?: { query?: string | null };
  getScopedStaffUser: (userId: number) => Promise<any>;
  parsePositiveIntegerSearchQuery: (query: string) => number | null;
  prisma: any;
  MARKING_PROJECT_SELECT: any;
  applyFuzzyFallback: <T>(
    initialItems: T[],
    options: {
      query: string;
      fetchFallbackCandidates: (limit: number) => Promise<T[]>;
      matches: (item: T, query: string) => boolean;
      limit?: number;
    },
  ) => Promise<T[]>;
  matchesMarkingProjectSearchQuery: (project: any, query: string) => boolean;
};

export async function getStaffProjectsForMarkingImpl({
  userId,
  options,
  getScopedStaffUser,
  parsePositiveIntegerSearchQuery,
  prisma,
  MARKING_PROJECT_SELECT,
  applyFuzzyFallback,
  matchesMarkingProjectSearchQuery,
}: StaffProjectMarkingDeps) {
  const user = await getScopedStaffUser(userId);
  if (!user) return [];

  const baseWhere: Prisma.ProjectWhereInput = {
    archivedAt: null,
    module: { enterpriseId: user.enterpriseId },
  };

  const roleCanAccessAll = user.role === "ADMIN" || user.role === "ENTERPRISE_ADMIN";
  const accessWhere: Prisma.ProjectWhereInput = roleCanAccessAll
    ? baseWhere
    : {
        AND: [
          baseWhere,
          {
            OR: [
              { module: { moduleLeads: { some: { userId } } } },
              { module: { moduleTeachingAssistants: { some: { userId } } } },
            ],
          },
        ],
      };

  const normalizedQuery = typeof options?.query === "string" ? options.query.trim() : "";
  const hasQuery = normalizedQuery.length > 0;
  const numericQuery = hasQuery ? parsePositiveIntegerSearchQuery(normalizedQuery) : null;

  const scopedWhere: Prisma.ProjectWhereInput = hasQuery
    ? {
        AND: [
          accessWhere,
          {
            OR: [
              { name: { contains: normalizedQuery } },
              { module: { name: { contains: normalizedQuery } } },
              { teams: { some: { teamName: { contains: normalizedQuery }, archivedAt: null, allocationLifecycle: "ACTIVE" } } },
              ...(numericQuery !== null ? [{ id: numericQuery }] : []),
            ],
          },
        ],
      }
    : accessWhere;

  let projects = await prisma.project.findMany({
    where: scopedWhere,
    orderBy: [{ moduleId: "asc" }, { id: "asc" }],
    select: MARKING_PROJECT_SELECT,
  });

  projects = await applyFuzzyFallback(projects, {
    query: normalizedQuery,
    fetchFallbackCandidates: (limit) =>
      prisma.project.findMany({
        where: accessWhere,
        orderBy: [{ moduleId: "asc" }, { id: "asc" }],
        select: MARKING_PROJECT_SELECT,
        take: limit,
      }),
    matches: (project, query) => matchesMarkingProjectSearchQuery(project, query),
  });

  return projects;
}
