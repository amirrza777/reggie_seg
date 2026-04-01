import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import { matchesFuzzySearchCandidate, parsePositiveIntegerSearchQuery } from "../../shared/fuzzySearch.js";
import { applyFuzzyFallback } from "../../shared/fuzzyFallback.js";

export * from "./warnings/repo.js";
export * from "./nav-flags/repo.js";
export * from "./team-health-review/repo.js";

export type ProjectDeadlineInput = {
  taskOpenDate: Date;
  taskDueDate: Date;
  taskDueDateMcf: Date;
  assessmentOpenDate: Date;
  assessmentDueDate: Date;
  assessmentDueDateMcf: Date;
  feedbackOpenDate: Date;
  feedbackDueDate: Date;
  feedbackDueDateMcf: Date;
};

export type StudentDeadlineOverrideInput = {
  taskOpenDate?: Date | null;
  taskDueDate?: Date | null;
  assessmentOpenDate?: Date | null;
  assessmentDueDate?: Date | null;
  feedbackOpenDate?: Date | null;
  feedbackDueDate?: Date | null;
  reason?: string | null;
};

type ModuleAccessRole = "OWNER" | "TEACHING_ASSISTANT" | "ENROLLED" | "ADMIN_ACCESS";

const MODULE_LIST_PROJECT_DEADLINE_SELECT = {
  taskOpenDate: true,
  taskDueDate: true,
  taskDueDateMcf: true,
  assessmentOpenDate: true,
  assessmentDueDate: true,
  assessmentDueDateMcf: true,
  feedbackOpenDate: true,
  feedbackDueDate: true,
  feedbackDueDateMcf: true,
} as const;

type ModuleListProjectDeadline = Prisma.ProjectDeadlineGetPayload<{ select: typeof MODULE_LIST_PROJECT_DEADLINE_SELECT }>;

const STAFF_PROJECT_LIST_SELECT = {
  id: true,
  name: true,
  moduleId: true,
  archivedAt: true,
  module: {
    select: {
      name: true,
    },
  },
  createdAt: true,
  deadline: { select: MODULE_LIST_PROJECT_DEADLINE_SELECT },
  _count: {
    select: {
      teams: true,
      githubRepositories: true,
    },
  },
  teams: {
    where: { archivedAt: null, allocationLifecycle: "ACTIVE" },
    select: {
      trelloBoardId: true,
      _count: {
        select: {
          peerAssessments: true,
        },
      },
      allocations: {
        select: {
          user: {
            select: {
              githubAccount: { select: { id: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProjectSelect;

const MODULE_LEAD_NAME_SELECT = {
  userId: true,
  user: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
} as const;

function deadlineInstantsMs(deadline: ModuleListProjectDeadline): number[] {
  return Object.values(deadline)
    .filter((v): v is Date => v instanceof Date)
    .map((d) => d.getTime());
}

function aggregateModuleProjectDateWindow(projects: { deadline: ModuleListProjectDeadline | null }[]): {
  projectWindowStart: Date | null;
  projectWindowEnd: Date | null;
} {
  let minMs: number | null = null;
  let maxMs: number | null = null;
  for (const p of projects) {
    if (!p.deadline) continue;
    for (const ms of deadlineInstantsMs(p.deadline)) {
      if (minMs === null || ms < minMs) minMs = ms;
      if (maxMs === null || ms > maxMs) maxMs = ms;
    }
  }
  return {
    projectWindowStart: minMs === null ? null : new Date(minMs),
    projectWindowEnd: maxMs === null ? null : new Date(maxMs),
  };
}

function matchesModuleSearchQuery(module: { id: number; code?: string | null; name: string }, query: string): boolean {
  return matchesFuzzySearchCandidate({
    query,
    candidateId: module.id,
    sources: [module.name, module.code ?? "", `module ${module.id}`],
  });
}

function matchesStaffProjectSearchQuery(
  project: { id: number; name: string; module: { name: string } | null },
  query: string,
): boolean {
  return matchesFuzzySearchCandidate({
    query,
    candidateId: project.id,
    sources: [project.name, project.module?.name ?? "", `project ${project.id}`],
  });
}

function resolveModuleAccessRole(
  userRole: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN",
  flags: { isOwner: boolean; isTeachingAssistant: boolean; isEnrolled: boolean },
): ModuleAccessRole {
  if (userRole === "ADMIN" || userRole === "ENTERPRISE_ADMIN") {
    return "ADMIN_ACCESS";
  }

  if (flags.isOwner) return "OWNER";
  if (flags.isTeachingAssistant) return "TEACHING_ASSISTANT";
  if (flags.isEnrolled) return "ENROLLED";

  return "ENROLLED";
}

/** Full lead/TA lists */
function useStaffModuleStaffList(options?: { staffOnly?: boolean; compact?: boolean }): boolean {
  return options?.staffOnly === true && options?.compact !== true;
}

type ModuleLeadTaSlice = {
  moduleLeads: { userId: number }[];
  moduleTeachingAssistants: { userId: number }[];
  userModules: { userId: number }[];
};

function moduleLeadAndTaSelect(
  user: { id: number },
  listMode: boolean,
): Pick<Prisma.ModuleSelect, "moduleLeads" | "moduleTeachingAssistants"> {
  if (listMode) {
    return {
      moduleLeads: { select: MODULE_LEAD_NAME_SELECT },
      moduleTeachingAssistants: { select: { userId: true } },
    };
  }
  return {
    moduleLeads: {
      select: MODULE_LEAD_NAME_SELECT,
    },
    moduleTeachingAssistants: {
      where: { userId: user.id },
      select: { userId: true },
      take: 1,
    },
  };
}

function moduleAccessFlagsForUser(
  module: ModuleLeadTaSlice,
  userId: number,
  listMode: boolean,
): { isOwner: boolean; isTeachingAssistant: boolean; isEnrolled: boolean } {
  return {
    isOwner: module.moduleLeads.some((l) => l.userId === userId),
    isTeachingAssistant: listMode
      ? module.moduleTeachingAssistants.some((t) => t.userId === userId)
      : module.moduleTeachingAssistants.length > 0,
    isEnrolled: module.userModules.length > 0,
  };
}

function countUniqueStaffOnModule(module: ModuleLeadTaSlice, listMode: boolean): number | undefined {
  if (!listMode) return undefined;
  return new Set([
    ...module.moduleLeads.map((l) => l.userId),
    ...module.moduleTeachingAssistants.map((t) => t.userId),
  ]).size;
}

function formatUserDisplayName(user: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  const fullName = [user?.firstName?.trim(), user?.lastName?.trim()].filter((part): part is string => Boolean(part)).join(" ");
  return fullName.trim();
}

function buildModuleLeadNames(
  moduleLeads: Array<{ userId: number; user?: { firstName?: string | null; lastName?: string | null } | null }>,
): string[] {
  const seenUserIds = new Set<number>();
  const names: string[] = [];

  for (const lead of moduleLeads) {
    if (seenUserIds.has(lead.userId)) continue;
    seenUserIds.add(lead.userId);
    const name = formatUserDisplayName(lead.user);
    if (!name) continue;
    names.push(name);
  }

  return names;
}

type ModuleMembershipUser = { id: number; role: string; enterpriseId: string };

/** Which modules appear in a user's module list (workspace vs staff scope). */
function buildModuleMembershipFilterForUser(user: ModuleMembershipUser, staffOnly: boolean): Prisma.ModuleWhereInput {
  if (user.role === "ADMIN" || user.role === "ENTERPRISE_ADMIN") {
    return { enterpriseId: user.enterpriseId };
  }
  if (user.role === "STAFF") {
    return {
      enterpriseId: user.enterpriseId,
      OR: [
        { moduleLeads: { some: { userId: user.id } } },
        { moduleTeachingAssistants: { some: { userId: user.id } } },
        { userModules: { some: { userId: user.id, enterpriseId: user.enterpriseId } } },
      ],
    };
  }
  return {
    enterpriseId: user.enterpriseId,
    ...(staffOnly
      ? { moduleTeachingAssistants: { some: { userId: user.id } } }
      : { userModules: { some: { userId: user.id, enterpriseId: user.enterpriseId } } }),
  };
}

export type ModuleStaffListMember = {
  userId: number;
  email: string;
  displayName: string;
  roles: Array<"LEAD" | "TA">;
};

/**
 * Module leads + teaching assistants (deduped) if the caller has staff-list access to the module.
 */
export async function getModuleStaffListForUser(
  userId: number,
  moduleId: number,
): Promise<{ ok: true; members: ModuleStaffListMember[] } | { ok: false; status: 403 }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });
  if (!user) {
    return { ok: false, status: 403 };
  }

  const accessWhere = buildModuleMembershipFilterForUser(user, true);
  const module = await prisma.module.findFirst({
    where: {
      id: moduleId,
      ...accessWhere,
    },
    select: {
      id: true,
      moduleLeads: {
        select: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      },
      moduleTeachingAssistants: {
        select: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!module) {
    return { ok: false, status: 403 };
  }

  type Acc = {
    userId: number;
    email: string;
    displayName: string;
    roles: Array<"LEAD" | "TA">;
  };
  const byId = new Map<number, Acc>();

  const displayName = (firstName: string, lastName: string) =>
    `${firstName} ${lastName}`.trim() || "Unknown";

  for (const row of module.moduleLeads) {
    const u = row.user;
    const cur: Acc = byId.get(u.id) ?? {
      userId: u.id,
      email: u.email,
      displayName: displayName(u.firstName, u.lastName),
      roles: [],
    };
    if (!cur.roles.includes("LEAD")) cur.roles.push("LEAD");
    byId.set(u.id, cur);
  }
  for (const row of module.moduleTeachingAssistants) {
    const u = row.user;
    const cur: Acc = byId.get(u.id) ?? {
      userId: u.id,
      email: u.email,
      displayName: displayName(u.firstName, u.lastName),
      roles: [],
    };
    if (!cur.roles.includes("TA")) cur.roles.push("TA");
    byId.set(u.id, cur);
  }

  const members = Array.from(byId.values()).sort((a, b) => {
    const ln = a.displayName.localeCompare(b.displayName);
    if (ln !== 0) return ln;
    return a.userId - b.userId;
  });

  return { ok: true, members };
}

export type ModuleStudentProjectMatrixProject = { id: number; name: string };

export type ModuleStudentProjectMatrixStudent = {
  userId: number;
  email: string;
  displayName: string;
  teamCells: Array<{ teamId: number; teamName: string } | null>;
};

/**
 * Enrolled module students × project team assignments (for staff module overview).
 */
export async function getModuleStudentProjectMatrixForUser(
  userId: number,
  moduleId: number,
): Promise<
  | { ok: true; projects: ModuleStudentProjectMatrixProject[]; students: ModuleStudentProjectMatrixStudent[] }
  | { ok: false; status: 403 }
> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });
  if (!user) {
    return { ok: false, status: 403 };
  }

  const accessWhere = buildModuleMembershipFilterForUser(user, true);
  const moduleRow = await prisma.module.findFirst({
    where: {
      id: moduleId,
      ...accessWhere,
    },
    select: {
      id: true,
      projects: {
        select: {
          id: true,
          name: true,
          teams: {
            where: { archivedAt: null, allocationLifecycle: "ACTIVE" },
            select: {
              id: true,
              teamName: true,
              allocations: { select: { userId: true } },
            },
          },
        },
      },
      userModules: {
        select: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!moduleRow) {
    return { ok: false, status: 403 };
  }

  const toDisplayName = (firstName: string, lastName: string) =>
    `${firstName} ${lastName}`.trim() || "Unknown";

  type Cell = { teamId: number; teamName: string };
  const studentMap = new Map<
    number,
    { userId: number; email: string; displayName: string; cells: Map<number, Cell> }
  >();

  for (const um of moduleRow.userModules) {
    const u = um.user;
    studentMap.set(u.id, {
      userId: u.id,
      email: u.email,
      displayName: toDisplayName(u.firstName, u.lastName),
      cells: new Map(),
    });
  }

  const orphanUserIds = new Set<number>();
  for (const project of moduleRow.projects) {
    for (const team of project.teams) {
      for (const alloc of team.allocations) {
        if (!studentMap.has(alloc.userId)) {
          orphanUserIds.add(alloc.userId);
        }
      }
    }
  }

  if (orphanUserIds.size > 0) {
    const orphans = await prisma.user.findMany({
      where: { id: { in: [...orphanUserIds] } },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    for (const u of orphans) {
      studentMap.set(u.id, {
        userId: u.id,
        email: u.email,
        displayName: toDisplayName(u.firstName, u.lastName),
        cells: new Map(),
      });
    }
  }

  const pickBetterCell = (current: Cell | undefined, next: Cell): Cell => {
    if (!current) return next;
    return next.teamName.localeCompare(current.teamName) < 0 ? next : current;
  };

  for (const project of moduleRow.projects) {
    for (const team of project.teams) {
      for (const alloc of team.allocations) {
        const row = studentMap.get(alloc.userId);
        if (!row) continue;
        const next: Cell = { teamId: team.id, teamName: team.teamName };
        const prev = row.cells.get(project.id);
        row.cells.set(project.id, pickBetterCell(prev, next));
      }
    }
  }

  const projects = [...moduleRow.projects]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({ id: p.id, name: p.name }));

  const students = Array.from(studentMap.values())
    .sort((a, b) => {
      const byName = a.displayName.localeCompare(b.displayName);
      if (byName !== 0) return byName;
      return a.userId - b.userId;
    })
    .map((row) => ({
      userId: row.userId,
      email: row.email,
      displayName: row.displayName,
      teamCells: projects.map((p) => row.cells.get(p.id) ?? null),
    }));

  return { ok: true, projects, students };
}

/** Returns the user projects. */
export async function getUserProjects(userId: number) {
  return prisma.project.findMany({
    where: {
      teams: {
        some: {
          archivedAt: null,
          allocationLifecycle: "ACTIVE",
          allocations: {
            some: {
              userId,
            },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      moduleId: true,
      archivedAt: true,
      module: {
        select: {
          name: true,
        },
      },
    },
  });
}

/** Returns the modules for user. */
export async function getModulesForUser(
  userId: number,
  options?: { staffOnly?: boolean; compact?: boolean; query?: string | null },
) {
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

    return compactModules.map((module) => {
      const moduleLeadNames = buildModuleLeadNames(module.moduleLeads);
      const accessRole = resolveModuleAccessRole(user.role, {
        isOwner: module.moduleLeads.some((lead) => lead.userId === user.id),
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
      timelineText: true,
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
          timelineText: true,
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

  return modules.map((module) => {
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
      timelineText: module.timelineText,
      expectationsText: module.expectationsText,
      readinessNotesText: module.readinessNotesText,
      moduleLeadNames,
      leaderCount: module._count.moduleLeads,
      teachingAssistantCount: module._count.moduleTeachingAssistants,
      createdAt: module.createdAt,
      archivedAt: module.archivedAt,
      projectWindowStart,
      projectWindowEnd,
      teamCount: module.projects.reduce((sum, project) => sum + project._count.teams, 0),
      projectCount: module.projects.length,
      accessRole,
      ...(staffWithAccessCount !== undefined ? { staffWithAccessCount } : {}),
    };
  });
}

async function getScopedStaffUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });
}

/** Returns the staff projects. */
export async function getStaffProjects(userId: number, options?: { query?: string | null; moduleId?: number }) {
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

/** Returns the staff project teams. */
export async function getStaffProjectTeams(userId: number, projectId: number) {
  const user = await getScopedStaffUser(userId);
  if (!user) return null;

  const roleCanAccessAll = user.role === "ADMIN" || user.role === "ENTERPRISE_ADMIN";

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      module: {
        enterpriseId: user.enterpriseId,
        ...(roleCanAccessAll
          ? {}
          : {
              OR: [
                { moduleLeads: { some: { userId } } },
                { moduleTeachingAssistants: { some: { userId } } },
              ],
            }),
      },
    },
    select: {
      id: true,
      name: true,
      moduleId: true,
      module: {
        select: {
          name: true,
        },
      },
      teams: {
        where: { archivedAt: null, allocationLifecycle: "ACTIVE" },
        orderBy: { id: "asc" },
        select: {
          id: true,
          teamName: true,
          projectId: true,
          allocationLifecycle: true,
          createdAt: true,
          inactivityFlag: true,
          deadlineProfile: true,
          trelloBoardId: true,
          deadlineOverride: {
            select: {
              id: true,
            },
          },
          allocations: {
            select: {
              userId: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  trelloMemberId: true,
                  githubAccount: { select: { id: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  return project;
}

const MARKING_PROJECT_SELECT = {
  id: true,
  name: true,
  moduleId: true,
  module: { select: { name: true } },
  teams: {
    where: { archivedAt: null, allocationLifecycle: "ACTIVE" as const },
    orderBy: { id: "asc" as const },
    select: {
      id: true,
      teamName: true,
      projectId: true,
      inactivityFlag: true,
      _count: { select: { allocations: true } },
    },
  },
} satisfies Prisma.ProjectSelect;

type MarkingProject = Prisma.ProjectGetPayload<{ select: typeof MARKING_PROJECT_SELECT }>;

function matchesMarkingProjectSearchQuery(project: MarkingProject, query: string): boolean {
  const teamSources = project.teams.map((t) => t.teamName);
  return matchesFuzzySearchCandidate({
    query,
    candidateId: project.id,
    sources: [project.name, project.module?.name ?? "", ...teamSources],
  });
}

/** Returns all staff projects with teams for the marking overview (single query). */
export async function getStaffProjectsForMarking(userId: number, options?: { query?: string | null }) {
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

/** Returns the project by ID. */
export async function getProjectById(projectId: number) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      informationText: true,
      archivedAt: true,
      moduleId: true,
      questionnaireTemplateId: true,
      projectNavFlags: true,
    },
  });
}

/** Creates a project. */
export async function createProject(
  actorUserId: number,
  name: string,
  moduleId: number,
  questionnaireTemplateId: number,
  informationText: string | null,
  deadline: ProjectDeadlineInput,
) {
  const actor = await getScopedStaffUser(actorUserId);
  if (!actor) {
    throw { code: "FORBIDDEN", message: "User not found" };
  }

  const moduleRecord = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId: actor.enterpriseId },
    select: { id: true },
  });
  if (!moduleRecord) {
    throw { code: "MODULE_NOT_FOUND" };
  }

  const roleCanAccessAll = actor.role === "ADMIN" || actor.role === "ENTERPRISE_ADMIN";
  if (!roleCanAccessAll) {
    const staffModule = await prisma.module.findFirst({
      where: {
        id: moduleId,
        enterpriseId: actor.enterpriseId,
        OR: [
          { moduleLeads: { some: { userId: actorUserId } } },
          { moduleTeachingAssistants: { some: { userId: actorUserId } } },
        ],
      },
      select: { id: true },
    });
    if (!staffModule) {
      throw { code: "FORBIDDEN", message: "You do not have access to create projects in this module" };
    }
  }

  const template = await prisma.questionnaireTemplate.findUnique({
    where: { id: questionnaireTemplateId },
    select: { id: true },
  });
  if (!template) {
    throw { code: "TEMPLATE_NOT_FOUND" };
  }

  const project = await prisma.project.create({
    data: {
      name,
      informationText,
      moduleId,
      questionnaireTemplateId,
      deadline: {
        create: {
          taskOpenDate: deadline.taskOpenDate,
          taskDueDate: deadline.taskDueDate,
          taskDueDateMcf: deadline.taskDueDateMcf,
          assessmentOpenDate: deadline.assessmentOpenDate,
          assessmentDueDate: deadline.assessmentDueDate,
          assessmentDueDateMcf: deadline.assessmentDueDateMcf,
          feedbackOpenDate: deadline.feedbackOpenDate,
          feedbackDueDate: deadline.feedbackDueDate,
          feedbackDueDateMcf: deadline.feedbackDueDateMcf,
        },
      },
    },
    select: {
      id: true,
      name: true,
      informationText: true,
      moduleId: true,
      questionnaireTemplateId: true,
      deadline: {
        select: {
          taskOpenDate: true,
          taskDueDate: true,
          taskDueDateMcf: true,
          assessmentOpenDate: true,
          assessmentDueDate: true,
          assessmentDueDateMcf: true,
          feedbackOpenDate: true,
          feedbackDueDate: true,
          feedbackDueDateMcf: true,
        },
      },
    },
  });

  return project;
}

export async function updateStaffTeamDeadlineProfile(
  actorUserId: number,
  teamId: number,
  deadlineProfile: "STANDARD" | "MCF",
) {
  const actor = await getScopedStaffUser(actorUserId);
  if (!actor) {
    throw { code: "FORBIDDEN", message: "User not found" };
  }

  const isStaffRole = actor.role === "STAFF" || actor.role === "ENTERPRISE_ADMIN" || actor.role === "ADMIN";
  if (!isStaffRole) {
    throw { code: "FORBIDDEN", message: "Only staff can update team deadline profile" };
  }

  const roleCanAccessAll = actor.role === "ADMIN" || actor.role === "ENTERPRISE_ADMIN";

  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      archivedAt: null,
      allocationLifecycle: "ACTIVE",
      project: {
        module: {
          enterpriseId: actor.enterpriseId,
          ...(roleCanAccessAll
            ? {}
            : {
                OR: [
                  { moduleLeads: { some: { userId: actorUserId } } },
                  { moduleTeachingAssistants: { some: { userId: actorUserId } } },
                ],
              }),
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!team) {
    throw { code: "TEAM_NOT_FOUND" };
  }

  return prisma.team.update({
    where: { id: teamId },
    data: { deadlineProfile },
    select: {
      id: true,
      deadlineProfile: true,
    },
  });
}

/** Returns the teammates in project. */
export async function getTeammatesInProject(userId: number, projectId: number) {
  return prisma.teamAllocation.findMany({
    where: {
      team: {
        projectId,
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
        allocations: {
          some: {
            userId,
          },
        },
      },
    },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

/** Returns the user project deadline. */
export async function getUserProjectDeadline(userId: number, projectId: number) {
  const userTeam = await prisma.teamAllocation.findFirst({
    where: {
      userId,
      team: {
        projectId,
        archivedAt: null,
        allocationLifecycle: "ACTIVE",
      },
    },
    select: {
      team: {
        select: {
          id: true,
          deadlineProfile: true,
          deadlineOverride: {
            select: {
              taskOpenDate: true,
              taskDueDate: true,
              assessmentOpenDate: true,
              assessmentDueDate: true,
              feedbackOpenDate: true,
              feedbackDueDate: true,
            },
          },
          project: {
            select: {
              deadline: {
                select: {
                  taskOpenDate: true,
                  taskDueDate: true,
                  taskDueDateMcf: true,
                  assessmentOpenDate: true,
                  assessmentDueDate: true,
                  assessmentDueDateMcf: true,
                  feedbackOpenDate: true,
                  feedbackDueDate: true,
                  feedbackDueDateMcf: true,
                  studentOverrides: {
                    where: { userId },
                    take: 1,
                    select: {
                      taskOpenDate: true,
                      taskDueDate: true,
                      assessmentOpenDate: true,
                      assessmentDueDate: true,
                      feedbackOpenDate: true,
                      feedbackDueDate: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!userTeam) {
    return null;
  }
  const projectDeadline = userTeam.team.project.deadline;
  const teamOverride = userTeam.team.deadlineOverride;
  const studentOverride = projectDeadline?.studentOverrides?.[0];
  const teamUsesMcfDeadline = userTeam.team.deadlineProfile === "MCF";

  const taskDueDate =
    studentOverride?.taskDueDate ??
    teamOverride?.taskDueDate ??
    (teamUsesMcfDeadline
      ? projectDeadline?.taskDueDateMcf ?? projectDeadline?.taskDueDate
      : projectDeadline?.taskDueDate);
  const assessmentDueDate =
    studentOverride?.assessmentDueDate ??
    teamOverride?.assessmentDueDate ??
    (teamUsesMcfDeadline
      ? projectDeadline?.assessmentDueDateMcf ?? projectDeadline?.assessmentDueDate
      : projectDeadline?.assessmentDueDate);
  const feedbackDueDate =
    studentOverride?.feedbackDueDate ??
    teamOverride?.feedbackDueDate ??
    (teamUsesMcfDeadline
      ? projectDeadline?.feedbackDueDateMcf ?? projectDeadline?.feedbackDueDate
      : projectDeadline?.feedbackDueDate);

  const hasStudentOverride = Boolean(
    studentOverride?.taskOpenDate ||
    studentOverride?.taskDueDate ||
    studentOverride?.assessmentOpenDate ||
    studentOverride?.assessmentDueDate ||
    studentOverride?.feedbackOpenDate ||
    studentOverride?.feedbackDueDate
  );
  const hasTeamOverride = Boolean(teamOverride);

  return {
    taskOpenDate: studentOverride?.taskOpenDate ?? teamOverride?.taskOpenDate ?? projectDeadline?.taskOpenDate,
    taskDueDate,
    assessmentOpenDate:
      studentOverride?.assessmentOpenDate ?? teamOverride?.assessmentOpenDate ?? projectDeadline?.assessmentOpenDate,
    assessmentDueDate,
    feedbackOpenDate: studentOverride?.feedbackOpenDate ?? teamOverride?.feedbackOpenDate ?? projectDeadline?.feedbackOpenDate,
    feedbackDueDate,
    isOverridden: hasStudentOverride || hasTeamOverride,
    overrideScope: hasStudentOverride ? "STUDENT" : hasTeamOverride ? "TEAM" : "NONE",
    deadlineProfile: userTeam.team.deadlineProfile,
  };
}

/** Returns the team by ID. */
export async function getTeamById(teamId: number) {
  return prisma.team.findFirst({
    where: { id: teamId, archivedAt: null, allocationLifecycle: "ACTIVE" },
    select: {
      id: true,
      teamName: true,
      projectId: true,
      createdAt: true,
      allocations: {
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

/** Returns the team by user and project. */
export async function getTeamByUserAndProject(userId: number, projectId: number) {
  return prisma.team.findFirst({
    where: {
      projectId,
      archivedAt: null,
      allocationLifecycle: "ACTIVE",
      allocations: {
        some: {
          userId,
        },
      },
    },
    select: {
      id: true,
      teamName: true,
      projectId: true,
      createdAt: true,
      allocations: {
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

/** Returns the questions for project. */
export async function getQuestionsForProject(projectId: number) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: {
      questionnaireTemplate: {
        select: {
          id: true,
          questions: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              label: true,
              type: true,
              order: true,
              configs: true,
            },
          },
        },
      },
    },
  });
}

type RawStaffMarking = {
  mark: number | null;
  formativeFeedback: string | null;
  updatedAt: Date;
  marker: { id: number; firstName: string; lastName: string };
};

function mapStaffMarking(marking: RawStaffMarking | null) {
  if (!marking) return null;
  return {
    mark: marking.mark ?? null,
    formativeFeedback: marking.formativeFeedback ?? null,
    updatedAt: marking.updatedAt.toISOString(),
    marker: {
      id: marking.marker.id,
      firstName: marking.marker.firstName,
      lastName: marking.marker.lastName,
    },
  };
}

/** Returns the user project marking. */
export async function getUserProjectMarking(userId: number, projectId: number) {
  const enrollment = await prisma.teamAllocation.findFirst({
    where: {
      userId,
      team: { projectId, archivedAt: null, allocationLifecycle: "ACTIVE" },
    },
    select: {
      teamId: true,
      team: {
        select: {
          staffTeamMarking: {
            select: {
              mark: true,
              formativeFeedback: true,
              updatedAt: true,
              marker: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          staffStudentMarkings: {
            where: { studentUserId: userId },
            select: {
              mark: true,
              formativeFeedback: true,
              updatedAt: true,
              marker: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!enrollment) {
    return null;
  }

  const studentMarking = enrollment.team.staffStudentMarkings[0] ?? null;
  return {
    teamId: enrollment.teamId,
    teamMarking: mapStaffMarking(enrollment.team.staffTeamMarking),
    studentMarking: mapStaffMarking(studentMarking),
  };
}

const teamHealthMessageSelect = {
  id: true,
  projectId: true,
  teamId: true,
  requesterUserId: true,
  reviewedByUserId: true,
  subject: true,
  details: true,
  responseText: true,
  resolved: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  requester: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  reviewedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

export async function createTeamHealthMessage(
  projectId: number,
  teamId: number,
  requesterUserId: number,
  subject: string,
  details: string
) {
  return prisma.teamHealthMessage.create({
    data: {
      projectId,
      teamId,
      requesterUserId,
      subject,
      details,
    },
    select: teamHealthMessageSelect,
  });
}

export async function getTeamHealthMessagesForUserInProject(projectId: number, requesterUserId: number) {
  return prisma.teamHealthMessage.findMany({
    where: {
      projectId,
      requesterUserId,
    },
    orderBy: { createdAt: "desc" },
    select: teamHealthMessageSelect,
  });
}

export async function getTeamHealthMessagesForTeamInProject(projectId: number, teamId: number) {
  return prisma.teamHealthMessage.findMany({
    where: {
      projectId,
      teamId,
    },
    orderBy: { createdAt: "desc" },
    select: teamHealthMessageSelect,
  });
}

export async function hasAnotherResolvedTeamHealthMessage(projectId: number, teamId: number, requestId: number) {
  const existing = await prisma.teamHealthMessage.findFirst({
    where: {
      projectId,
      teamId,
      resolved: true,
      NOT: { id: requestId },
    },
    select: { id: true },
  });

  return Boolean(existing);
}

export async function canStaffAccessTeamInProject(userId: number, projectId: number, teamId: number) {
  const user = await getScopedStaffUser(userId);
  if (!user) return false;

  const roleCanAccessAll = user.role === "ADMIN" || user.role === "ENTERPRISE_ADMIN";
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      teams: {
        some: { id: teamId, archivedAt: null, allocationLifecycle: "ACTIVE" },
      },
      module: {
        enterpriseId: user.enterpriseId,
        ...(roleCanAccessAll
          ? {}
          : {
              OR: [
                { moduleLeads: { some: { userId } } },
                { moduleTeachingAssistants: { some: { userId } } },
              ],
            }),
      },
    },
    select: { id: true },
  });

  return Boolean(project);
}

type DeadlineSnapshot = {
  taskOpenDate: Date | null;
  taskDueDate: Date | null;
  assessmentOpenDate: Date | null;
  assessmentDueDate: Date | null;
  feedbackOpenDate: Date | null;
  feedbackDueDate: Date | null;
  isOverridden: boolean;
};

type DeadlineFieldKey =
  | "taskOpenDate"
  | "taskDueDate"
  | "assessmentOpenDate"
  | "assessmentDueDate"
  | "feedbackOpenDate"
  | "feedbackDueDate";

export type DeadlineInputMode = "SHIFT_DAYS" | "SELECT_DATE";

type DeadlineOverrideMetadata = {
  inputMode: DeadlineInputMode;
  shiftDays?: Partial<Record<DeadlineFieldKey, number>>;
};

function parseDeadlineOverrideMetadata(reason: string | null | undefined): DeadlineOverrideMetadata | null {
  if (!reason) return null;
  try {
    const parsed = JSON.parse(reason) as {
      inputMode?: unknown;
      shiftDays?: unknown;
    };
    if (parsed.inputMode !== "SHIFT_DAYS" && parsed.inputMode !== "SELECT_DATE") {
      return null;
    }

    const shiftDays: Partial<Record<DeadlineFieldKey, number>> = {};
    if (parsed.shiftDays && typeof parsed.shiftDays === "object" && !Array.isArray(parsed.shiftDays)) {
      const candidate = parsed.shiftDays as Record<string, unknown>;
      const fields: DeadlineFieldKey[] = [
        "taskOpenDate",
        "taskDueDate",
        "assessmentOpenDate",
        "assessmentDueDate",
        "feedbackOpenDate",
        "feedbackDueDate",
      ];

      for (const field of fields) {
        const value = candidate[field];
        if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
          shiftDays[field] = value;
        }
      }
    }

    return {
      inputMode: parsed.inputMode,
      ...(Object.keys(shiftDays).length > 0 ? { shiftDays } : {}),
    };
  } catch {
    return null;
  }
}

function serializeDeadlineOverrideMetadata(
  metadata?:
    | {
        inputMode?: DeadlineInputMode;
        shiftDays?: Partial<Record<DeadlineFieldKey, number>>;
      }
    | null
) {
  if (!metadata?.inputMode) return undefined;

  const payload: DeadlineOverrideMetadata = {
    inputMode: metadata.inputMode,
  };

  if (metadata.inputMode === "SHIFT_DAYS" && metadata.shiftDays) {
    const sanitised: Partial<Record<DeadlineFieldKey, number>> = {};
    const fields: DeadlineFieldKey[] = [
      "taskOpenDate",
      "taskDueDate",
      "assessmentOpenDate",
      "assessmentDueDate",
      "feedbackOpenDate",
      "feedbackDueDate",
    ];

    for (const field of fields) {
      const value = metadata.shiftDays[field];
      if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
        sanitised[field] = value;
      }
    }
    if (Object.keys(sanitised).length > 0) {
      payload.shiftDays = sanitised;
    }
  }

  return JSON.stringify(payload);
}

function mergeDeadlinesForTeam(
  projectDeadline: {
    taskOpenDate: Date;
    taskDueDate: Date;
    assessmentOpenDate: Date;
    assessmentDueDate: Date;
    feedbackOpenDate: Date;
    feedbackDueDate: Date;
  } | null,
  teamOverride: {
    taskOpenDate: Date | null;
    taskDueDate: Date | null;
    assessmentOpenDate: Date | null;
    assessmentDueDate: Date | null;
    feedbackOpenDate: Date | null;
    feedbackDueDate: Date | null;
  } | null
): DeadlineSnapshot | null {
  if (!projectDeadline) return null;
  return {
    taskOpenDate: teamOverride?.taskOpenDate ?? projectDeadline.taskOpenDate,
    taskDueDate: teamOverride?.taskDueDate ?? projectDeadline.taskDueDate,
    assessmentOpenDate: teamOverride?.assessmentOpenDate ?? projectDeadline.assessmentOpenDate,
    assessmentDueDate: teamOverride?.assessmentDueDate ?? projectDeadline.assessmentDueDate,
    feedbackOpenDate: teamOverride?.feedbackOpenDate ?? projectDeadline.feedbackOpenDate,
    feedbackDueDate: teamOverride?.feedbackDueDate ?? projectDeadline.feedbackDueDate,
    isOverridden: Boolean(teamOverride),
  };
}

export async function getTeamCurrentDeadlineInProject(projectId: number, teamId: number) {
  const team = await prisma.team.findFirst({
    where: { id: teamId, projectId },
    select: {
      project: {
        select: {
          deadline: {
            select: {
              taskOpenDate: true,
              taskDueDate: true,
              assessmentOpenDate: true,
              assessmentDueDate: true,
              feedbackOpenDate: true,
              feedbackDueDate: true,
            },
          },
        },
      },
      deadlineOverride: {
        select: {
          taskOpenDate: true,
          taskDueDate: true,
          assessmentOpenDate: true,
          assessmentDueDate: true,
          feedbackOpenDate: true,
          feedbackDueDate: true,
        },
      },
    },
  });
  if (!team) return null;
  return mergeDeadlinesForTeam(team.project.deadline, team.deadlineOverride);
}

export async function getTeamDeadlineDetailsInProject(projectId: number, teamId: number) {
  const team = await prisma.team.findFirst({
    where: { id: teamId, projectId },
    select: {
      project: {
        select: {
          deadline: {
            select: {
              taskOpenDate: true,
              taskDueDate: true,
              assessmentOpenDate: true,
              assessmentDueDate: true,
              feedbackOpenDate: true,
              feedbackDueDate: true,
            },
          },
        },
      },
      deadlineOverride: {
        select: {
          taskOpenDate: true,
          taskDueDate: true,
          assessmentOpenDate: true,
          assessmentDueDate: true,
          feedbackOpenDate: true,
          feedbackDueDate: true,
          reason: true,
        },
      },
    },
  });
  if (!team?.project.deadline) return null;

  const effectiveDeadline = mergeDeadlinesForTeam(team.project.deadline, team.deadlineOverride);
  if (!effectiveDeadline) return null;

  const metadata = parseDeadlineOverrideMetadata(team.deadlineOverride?.reason);
  return {
    baseDeadline: {
      taskOpenDate: team.project.deadline.taskOpenDate,
      taskDueDate: team.project.deadline.taskDueDate,
      assessmentOpenDate: team.project.deadline.assessmentOpenDate,
      assessmentDueDate: team.project.deadline.assessmentDueDate,
      feedbackOpenDate: team.project.deadline.feedbackOpenDate,
      feedbackDueDate: team.project.deadline.feedbackDueDate,
      isOverridden: false,
    },
    effectiveDeadline,
    deadlineInputMode: metadata?.inputMode ?? null,
    shiftDays: metadata?.shiftDays ?? null,
  };
}

export async function reviewTeamHealthMessage(
  projectId: number,
  teamId: number,
  requestId: number,
  reviewerUserId: number,
  resolved: boolean,
  responseText?: string
) {
  const existing = await prisma.teamHealthMessage.findFirst({
    where: { id: requestId, projectId, teamId },
    select: { id: true, resolved: true },
  });
  if (!existing) return null;

  if (!resolved && existing.resolved) {
    return prisma.$transaction(async (tx) => {
      await tx.teamDeadlineOverride.deleteMany({
        where: { teamId },
      });

      return tx.teamHealthMessage.update({
        where: { id: requestId },
        data: {
          resolved: false,
          reviewedByUserId: reviewerUserId,
          reviewedAt: new Date(),
          responseText: null,
        },
        select: teamHealthMessageSelect,
      });
    });
  }

  return prisma.teamHealthMessage.update({
    where: { id: requestId },
    data: {
      resolved,
      reviewedByUserId: reviewerUserId,
      reviewedAt: new Date(),
      ...(resolved
        ? { ...(responseText !== undefined ? { responseText } : {}) }
        : { responseText: null }),
    },
    select: teamHealthMessageSelect,
  });
}

export async function resolveTeamHealthMessageWithDeadlineOverride(
  projectId: number,
  teamId: number,
  requestId: number,
  reviewerUserId: number,
  overrides: {
    taskOpenDate: Date | null;
    taskDueDate: Date | null;
    assessmentOpenDate: Date | null;
    assessmentDueDate: Date | null;
    feedbackOpenDate: Date | null;
    feedbackDueDate: Date | null;
  },
  metadata?: {
    inputMode?: DeadlineInputMode;
    shiftDays?: Partial<Record<DeadlineFieldKey, number>>;
  }
) {
  return prisma.$transaction(async (tx) => {
    const existingRequest = await tx.teamHealthMessage.findFirst({
      where: { id: requestId, projectId, teamId },
      select: { id: true },
    });
    if (!existingRequest) return null;

    const team = await tx.team.findFirst({
      where: { id: teamId, projectId },
      select: {
        project: {
          select: {
            deadline: {
              select: {
                id: true,
                taskOpenDate: true,
                taskDueDate: true,
                assessmentOpenDate: true,
                assessmentDueDate: true,
                feedbackOpenDate: true,
                feedbackDueDate: true,
              },
            },
          },
        },
      },
    });
    const projectDeadline = team?.project.deadline ?? null;
    if (!projectDeadline) return null;

    const reason = serializeDeadlineOverrideMetadata(metadata);

    const deadlineOverride = await tx.teamDeadlineOverride.upsert({
      where: { teamId },
      update: {
        projectDeadlineId: projectDeadline.id,
        taskOpenDate: overrides.taskOpenDate,
        taskDueDate: overrides.taskDueDate,
        assessmentOpenDate: overrides.assessmentOpenDate,
        assessmentDueDate: overrides.assessmentDueDate,
        feedbackOpenDate: overrides.feedbackOpenDate,
        feedbackDueDate: overrides.feedbackDueDate,
        ...(reason !== undefined ? { reason } : {}),
      },
      create: {
        teamId,
        projectDeadlineId: projectDeadline.id,
        taskOpenDate: overrides.taskOpenDate,
        taskDueDate: overrides.taskDueDate,
        assessmentOpenDate: overrides.assessmentOpenDate,
        assessmentDueDate: overrides.assessmentDueDate,
        feedbackOpenDate: overrides.feedbackOpenDate,
        feedbackDueDate: overrides.feedbackDueDate,
        reason: reason ?? null,
      },
      select: {
        taskOpenDate: true,
        taskDueDate: true,
        assessmentOpenDate: true,
        assessmentDueDate: true,
        feedbackOpenDate: true,
        feedbackDueDate: true,
      },
    });

    const request = await tx.teamHealthMessage.update({
      where: { id: requestId },
      data: {
        resolved: true,
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
      },
      select: teamHealthMessageSelect,
    });

    const deadline = mergeDeadlinesForTeam(projectDeadline, deadlineOverride);
    if (!deadline) return null;
    return { request, deadline };
  });
}

async function getAccessibleProjectDeadlineScope(actorUserId: number, projectId: number) {
  const actor = await getScopedStaffUser(actorUserId);
  if (!actor) {
    throw { code: "FORBIDDEN", message: "User not found" };
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      module: {
        enterpriseId: actor.enterpriseId,
      },
    },
    select: {
      id: true,
      deadline: {
        select: {
          id: true,
        },
      },
    },
  });
  if (!project) {
    throw { code: "PROJECT_NOT_FOUND" };
  }

  const roleCanAccessAll = actor.role === "ADMIN" || actor.role === "ENTERPRISE_ADMIN";
  if (!roleCanAccessAll) {
    const accessibleProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        module: {
          enterpriseId: actor.enterpriseId,
          OR: [
            { moduleLeads: { some: { userId: actorUserId } } },
            { moduleTeachingAssistants: { some: { userId: actorUserId } } },
          ],
        },
      },
      select: { id: true },
    });
    if (!accessibleProject) {
      throw { code: "FORBIDDEN", message: "You do not have staff access to this project" };
    }
  }

  return project;
}

export async function getStaffStudentDeadlineOverrides(actorUserId: number, projectId: number) {
  const project = await getAccessibleProjectDeadlineScope(actorUserId, projectId);
  if (!project.deadline) {
    return [];
  }

  const overrides = await prisma.studentDeadlineOverride.findMany({
    where: {
      projectDeadlineId: project.deadline.id,
    },
    select: {
      id: true,
      userId: true,
      taskOpenDate: true,
      taskDueDate: true,
      assessmentOpenDate: true,
      assessmentDueDate: true,
      feedbackOpenDate: true,
      feedbackDueDate: true,
      reason: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });

  return overrides.map((override) => ({
    ...override,
    taskOpenDate: override.taskOpenDate?.toISOString() ?? null,
    taskDueDate: override.taskDueDate?.toISOString() ?? null,
    assessmentOpenDate: override.assessmentOpenDate?.toISOString() ?? null,
    assessmentDueDate: override.assessmentDueDate?.toISOString() ?? null,
    feedbackOpenDate: override.feedbackOpenDate?.toISOString() ?? null,
    feedbackDueDate: override.feedbackDueDate?.toISOString() ?? null,
    updatedAt: override.updatedAt.toISOString(),
  }));
}

async function ensureStudentInProject(projectId: number, studentId: number) {
  const allocation = await prisma.teamAllocation.findFirst({
    where: {
      userId: studentId,
      team: {
        projectId,
      },
    },
    select: { userId: true },
  });

  if (!allocation) {
    throw { code: "STUDENT_NOT_IN_PROJECT" };
  }
}

export async function upsertStaffStudentDeadlineOverride(
  actorUserId: number,
  projectId: number,
  studentId: number,
  payload: StudentDeadlineOverrideInput,
) {
  const project = await getAccessibleProjectDeadlineScope(actorUserId, projectId);
  if (!project.deadline) {
    throw { code: "PROJECT_NOT_FOUND" };
  }

  await ensureStudentInProject(projectId, studentId);

  const override = await prisma.studentDeadlineOverride.upsert({
    where: {
      userId_projectDeadlineId: {
        userId: studentId,
        projectDeadlineId: project.deadline.id,
      },
    },
    update: {
      ...(payload.taskOpenDate !== undefined ? { taskOpenDate: payload.taskOpenDate } : {}),
      ...(payload.taskDueDate !== undefined ? { taskDueDate: payload.taskDueDate } : {}),
      ...(payload.assessmentOpenDate !== undefined ? { assessmentOpenDate: payload.assessmentOpenDate } : {}),
      ...(payload.assessmentDueDate !== undefined ? { assessmentDueDate: payload.assessmentDueDate } : {}),
      ...(payload.feedbackOpenDate !== undefined ? { feedbackOpenDate: payload.feedbackOpenDate } : {}),
      ...(payload.feedbackDueDate !== undefined ? { feedbackDueDate: payload.feedbackDueDate } : {}),
      reason: payload.reason ?? null,
      createdByUserId: actorUserId,
    },
    create: {
      userId: studentId,
      projectDeadlineId: project.deadline.id,
      createdByUserId: actorUserId,
      taskOpenDate: payload.taskOpenDate ?? null,
      taskDueDate: payload.taskDueDate ?? null,
      assessmentOpenDate: payload.assessmentOpenDate ?? null,
      assessmentDueDate: payload.assessmentDueDate ?? null,
      feedbackOpenDate: payload.feedbackOpenDate ?? null,
      feedbackDueDate: payload.feedbackDueDate ?? null,
      reason: payload.reason ?? null,
    },
    select: {
      id: true,
      userId: true,
      taskOpenDate: true,
      taskDueDate: true,
      assessmentOpenDate: true,
      assessmentDueDate: true,
      feedbackOpenDate: true,
      feedbackDueDate: true,
      reason: true,
      updatedAt: true,
    },
  });

  return {
    ...override,
    taskOpenDate: override.taskOpenDate?.toISOString() ?? null,
    taskDueDate: override.taskDueDate?.toISOString() ?? null,
    assessmentOpenDate: override.assessmentOpenDate?.toISOString() ?? null,
    assessmentDueDate: override.assessmentDueDate?.toISOString() ?? null,
    feedbackOpenDate: override.feedbackOpenDate?.toISOString() ?? null,
    feedbackDueDate: override.feedbackDueDate?.toISOString() ?? null,
    updatedAt: override.updatedAt.toISOString(),
  };
}

export async function getModuleLeadsForProject(projectId: number) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { moduleId: true },
  });
  if (!project) return [];
  return prisma.moduleLead.findMany({
    where: { moduleId: project.moduleId },
    select: { userId: true },
  });
}

export async function clearStaffStudentDeadlineOverride(
  actorUserId: number,
  projectId: number,
  studentId: number,
) {
  const project = await getAccessibleProjectDeadlineScope(actorUserId, projectId);
  if (!project.deadline) {
    throw { code: "PROJECT_NOT_FOUND" };
  }

  await prisma.studentDeadlineOverride.deleteMany({
    where: {
      userId: studentId,
      projectDeadlineId: project.deadline.id,
    },
  });

  return { cleared: true };
}
