import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import { matchesFuzzySearchCandidate, parsePositiveIntegerSearchQuery } from "../../shared/fuzzySearch.js";
import { applyFuzzyFallback } from "../../shared/fuzzyFallback.js";
import { getStaffProjectsForMarkingImpl, getStaffProjectsImpl } from "./repo.highAuthorship.js";
import { getScopedStaffUser } from "./repo.staff-scope.js";

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
      teamAllocationQuestionnaireOpenDate: true,
      teamAllocationQuestionnaireDueDate: true,
    },
  },
  _count: {
    select: {
      teams: true,
      githubRepositories: true,
      projectStudents: true,
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

export async function getStaffProjects(userId: number, options?: { query?: string | null; moduleId?: number }) {
  return getStaffProjectsImpl({
    userId,
    options,
    getScopedStaffUser,
    parsePositiveIntegerSearchQuery,
    prisma,
    STAFF_PROJECT_LIST_SELECT,
    applyFuzzyFallback,
    matchesStaffProjectSearchQuery,
  });
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
  const teamSources = project.teams.map((team) => team.teamName);
  return matchesFuzzySearchCandidate({
    query,
    candidateId: project.id,
    sources: [project.name, project.module?.name ?? "", ...teamSources],
  });
}

export async function getStaffProjectsForMarking(userId: number, options?: { query?: string | null }) {
  return getStaffProjectsForMarkingImpl({
    userId,
    options,
    getScopedStaffUser,
    parsePositiveIntegerSearchQuery,
    prisma,
    MARKING_PROJECT_SELECT,
    applyFuzzyFallback,
    matchesMarkingProjectSearchQuery,
  });
}
