import { prisma } from "../../../shared/db.js";
import { assertProjectMutableForWritesByProjectId } from "../../../shared/projectWriteGuard.js";

async function getScopedStaffUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });
}

async function getStaffProjectWarningsSettingsScope(actorUserId: number, projectId: number) {
  const actor = await getScopedStaffUser(actorUserId);
  if (!actor) {
    throw { code: "FORBIDDEN", message: "User not found" };
  }

  const roleCanAccessAll = actor.role === "ADMIN" || actor.role === "ENTERPRISE_ADMIN";
  const isStaffLead = actor.role === "STAFF";
  if (!roleCanAccessAll && !isStaffLead) {
    throw { code: "FORBIDDEN", message: "Only module leads can update warning settings" };
  }

  const projectInEnterprise = await prisma.project.findFirst({
    where: {
      id: projectId,
      module: {
        enterpriseId: actor.enterpriseId,
      },
    },
    select: { id: true },
  });

  if (!projectInEnterprise) {
    throw { code: "PROJECT_NOT_FOUND" };
  }

  if (!roleCanAccessAll) {
    const leadAccess = await prisma.project.findFirst({
      where: {
        id: projectId,
        module: {
          enterpriseId: actor.enterpriseId,
          moduleLeads: { some: { userId: actorUserId } },
        },
      },
      select: { id: true },
    });

    if (!leadAccess) {
      throw { code: "FORBIDDEN", message: "Only module leads can update warning settings" };
    }
  }

  return projectInEnterprise;
}

export async function getStaffProjectWarningsConfig(actorUserId: number, projectId: number) {
  const scope = await getStaffProjectWarningsSettingsScope(actorUserId, projectId);
  return prisma.project.findUnique({
    where: { id: scope.id },
    select: {
      id: true,
      warningsConfig: true,
    },
  });
}

export async function updateStaffProjectWarningsConfig(
  actorUserId: number,
  projectId: number,
  warningsConfig: unknown,
) {
  const scope = await getStaffProjectWarningsSettingsScope(actorUserId, projectId);
  await assertProjectMutableForWritesByProjectId(scope.id);
  return prisma.project.update({
    where: { id: scope.id },
    data: { warningsConfig: warningsConfig as any },
    select: {
      id: true,
      warningsConfig: true,
    },
  });
}

export async function getProjectWarningsSettings(projectId: number) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      warningsConfig: true,
    },
  });
}

export type TeamWarningSignalSnapshot = {
  id: number;
  teamName: string;
  meetings: Array<{
    date: Date;
    attendances: Array<{ status: string }>;
  }>;
  commitsByDay: Record<string, number>;
  totalCommits: number;
};

function parseCountMap(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, number> = {};
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) continue;
    result[key] = parsed;
  }

  return result;
}

export async function getProjectTeamWarningSignals(projectId: number, sinceDate: Date): Promise<TeamWarningSignalSnapshot[]> {
  const teams = await prisma.team.findMany({
    where: {
      projectId,
      archivedAt: null,
      allocationLifecycle: "ACTIVE",
    },
    select: {
      id: true,
      teamName: true,
      allocations: {
        select: {
          userId: true,
        },
      },
      meetings: {
        where: {
          date: {
            gte: sinceDate,
          },
        },
        select: {
          date: true,
          attendances: {
            select: {
              status: true,
            },
          },
        },
      },
      project: {
        select: {
          githubRepositories: {
            where: {
              isActive: true,
            },
            select: {
              snapshots: {
                orderBy: {
                  analysedAt: "desc",
                },
                take: 1,
                select: {
                  userStats: {
                    select: {
                      mappedUserId: true,
                      commits: true,
                      commitsByDay: true,
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

  return teams.map((team) => {
    const memberIds = new Set(team.allocations.map((allocation) => allocation.userId));
    const commitsByDay: Record<string, number> = {};
    let totalCommits = 0;

    for (const repoLink of team.project.githubRepositories) {
      const latestSnapshot = repoLink.snapshots[0];
      if (!latestSnapshot) continue;

      for (const userStat of latestSnapshot.userStats) {
        if (userStat.mappedUserId === null || !memberIds.has(userStat.mappedUserId)) {
          continue;
        }

        totalCommits += userStat.commits;
        const dayMap = parseCountMap(userStat.commitsByDay);
        for (const [day, commitCount] of Object.entries(dayMap)) {
          commitsByDay[day] = (commitsByDay[day] ?? 0) + commitCount;
        }
      }
    }

    return {
      id: team.id,
      teamName: team.teamName,
      meetings: team.meetings,
      commitsByDay,
      totalCommits,
    };
  });
}

export async function getActiveAutoTeamWarningsForProject(projectId: number) {
  return prisma.teamWarning.findMany({
    where: {
      projectId,
      source: "AUTO",
      active: true,
    },
    select: {
      id: true,
      teamId: true,
      type: true,
      severity: true,
      title: true,
      details: true,
      createdAt: true,
    },
  });
}

export async function resolveTeamWarningById(warningId: number) {
  return prisma.teamWarning.update({
    where: { id: warningId },
    data: {
      active: false,
      resolvedAt: new Date(),
    },
    select: {
      id: true,
    },
  });
}

export type TeamWarningCreateInput = {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  details: string;
  source?: "AUTO" | "MANUAL";
  createdByUserId?: number | null;
};

export async function updateAutoTeamWarningById(
  warningId: number,
  input: Pick<TeamWarningCreateInput, "severity" | "title" | "details">,
) {
  return prisma.teamWarning.update({
    where: { id: warningId },
    data: {
      severity: input.severity,
      title: input.title,
      details: input.details,
    },
    select: {
      id: true,
    },
  });
}

const teamWarningSelect = {
  id: true,
  projectId: true,
  teamId: true,
  type: true,
  severity: true,
  title: true,
  details: true,
  source: true,
  active: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

export async function createTeamWarning(projectId: number, teamId: number, input: TeamWarningCreateInput) {
  return prisma.teamWarning.create({
    data: {
      projectId,
      teamId,
      type: input.type,
      severity: input.severity,
      title: input.title,
      details: input.details,
      source: input.source ?? "MANUAL",
      createdByUserId: input.createdByUserId ?? null,
    },
    select: teamWarningSelect,
  });
}

export async function getTeamWarningsForTeamInProject(
  projectId: number,
  teamId: number,
  options?: { activeOnly?: boolean },
) {
  return prisma.teamWarning.findMany({
    where: {
      projectId,
      teamId,
      ...(options?.activeOnly ? { active: true } : {}),
    },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    select: teamWarningSelect,
  });
}
