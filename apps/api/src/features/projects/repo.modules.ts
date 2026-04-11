import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import { matchesFuzzySearchCandidate, parsePositiveIntegerSearchQuery } from "../../shared/fuzzySearch.js";
import { applyFuzzyFallback } from "../../shared/fuzzyFallback.js";
import { getModulesForUserImpl } from "./repo.highAuthorship.js";
import { isAdminScopedRole, type StaffScopeRole } from "./repo.staff-scope.js";

type ModuleAccessRole = "OWNER" | "TEACHING_ASSISTANT" | "ENROLLED" | "ADMIN_ACCESS";

export const MODULE_LIST_PROJECT_DEADLINE_SELECT = {
  taskOpenDate: true,
  taskDueDate: true,
  taskDueDateMcf: true,
  assessmentOpenDate: true,
  assessmentDueDate: true,
  assessmentDueDateMcf: true,
  feedbackOpenDate: true,
  feedbackDueDate: true,
  feedbackDueDateMcf: true,
  teamAllocationQuestionnaireOpenDate: true,
  teamAllocationQuestionnaireDueDate: true,
} as const;

type ModuleListProjectDeadline = Prisma.ProjectDeadlineGetPayload<{ select: typeof MODULE_LIST_PROJECT_DEADLINE_SELECT }>;

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
    .filter((value): value is Date => value instanceof Date)
    .map((value) => value.getTime());
}

function aggregateModuleProjectDateWindow(projects: { deadline: ModuleListProjectDeadline | null }[]): {
  projectWindowStart: Date | null;
  projectWindowEnd: Date | null;
} {
  let minMs: number | null = null;
  let maxMs: number | null = null;

  for (const project of projects) {
    if (!project.deadline) {continue;}

    for (const instantMs of deadlineInstantsMs(project.deadline)) {
      minMs = minMs === null ? instantMs : Math.min(minMs, instantMs);
      maxMs = maxMs === null ? instantMs : Math.max(maxMs, instantMs);
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

function resolveModuleAccessRole(
  userRole: StaffScopeRole,
  flags: { isOwner: boolean; isTeachingAssistant: boolean; isEnrolled: boolean },
): ModuleAccessRole {
  if (isAdminScopedRole(userRole)) {
    return "ADMIN_ACCESS";
  }

  if (flags.isOwner) {return "OWNER";}
  if (flags.isTeachingAssistant) {return "TEACHING_ASSISTANT";}
  if (flags.isEnrolled) {return "ENROLLED";}

  return "ENROLLED";
}

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
    isOwner: module.moduleLeads.some((lead) => lead.userId === userId),
    isTeachingAssistant: listMode
      ? module.moduleTeachingAssistants.some((ta) => ta.userId === userId)
      : module.moduleTeachingAssistants.length > 0,
    isEnrolled: module.userModules.length > 0,
  };
}

function countUniqueStaffOnModule(module: ModuleLeadTaSlice, listMode: boolean): number | undefined {
  if (!listMode) {return undefined;}

  return new Set([...module.moduleLeads.map((lead) => lead.userId), ...module.moduleTeachingAssistants.map((ta) => ta.userId)])
    .size;
}

function formatUserDisplayName(user: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  const parts = [user?.firstName?.trim(), user?.lastName?.trim()].filter((part): part is string => Boolean(part));
  return parts.join(" ").trim();
}

function buildModuleLeadNames(
  moduleLeads: Array<{ userId: number; user?: { firstName?: string | null; lastName?: string | null } | null }>,
): string[] {
  const seenUserIds = new Set<number>();
  const names: string[] = [];

  for (const lead of moduleLeads) {
    if (seenUserIds.has(lead.userId)) {continue;}
    seenUserIds.add(lead.userId);

    const name = formatUserDisplayName(lead.user);
    if (!name) {continue;}
    names.push(name);
  }

  return names;
}

export type ModuleMembershipUser = { id: number; role: string; enterpriseId: string };

export function buildModuleMembershipFilterForUser(user: ModuleMembershipUser, staffOnly: boolean): Prisma.ModuleWhereInput {
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

export async function getModulesForUser(
  userId: number,
  options?: { staffOnly?: boolean; compact?: boolean; query?: string | null },
) {
  return getModulesForUserImpl({
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
  });
}
