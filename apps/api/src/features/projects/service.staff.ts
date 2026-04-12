import {
  getStaffProjects,
  getStaffProjectTeams,
  getStaffViewerModuleAccessLabel,
  getUserProjectMarking,
} from "./repo.js";
import { prisma } from "../../shared/db.js";

type StaffProjectListTeam = {
  trelloBoardId: string | null;
  allocations: { user: { githubAccount: { id: number } | null } }[];
  _count: { peerAssessments: number };
};

function deadlineRangeBounds(deadline: Record<string, unknown> | null | undefined): { start: Date | null; end: Date | null } {
  if (!deadline || typeof deadline !== "object") return { start: null, end: null };
  const instants: number[] = [];
  for (const v of Object.values(deadline)) {
    if (v instanceof Date) instants.push(v.getTime());
  }
  if (instants.length === 0) return { start: null, end: null };
  const min = Math.min(...instants);
  const max = Math.max(...instants);
  return { start: new Date(min), end: new Date(max) };
}

function trelloTeamsLinkedStats(teams: { trelloBoardId: string | null }[]) {
  const total = teams.length;
  if (total === 0) return { percent: 0, linked: 0, total: 0 };
  const linked = teams.filter((t) => t.trelloBoardId && String(t.trelloBoardId).trim()).length;
  return { percent: Math.round((linked / total) * 100), linked, total };
}

function peerAssessmentCompletionStats(teams: StaffProjectListTeam[]) {
  let submitted = 0;
  let expected = 0;
  for (const team of teams) {
    const n = team.allocations.length;
    if (n < 2) continue;
    expected += n * (n - 1);
    submitted += team._count.peerAssessments;
  }
  const percent = expected === 0 ? 0 : Math.min(100, Math.round((submitted / expected) * 100));
  return { percent, submitted, expected };
}

function githubMembersLinkedPercent(membersTotal: number, membersConnected: number) {
  if (membersTotal === 0) return 0;
  return Math.round((membersConnected / membersTotal) * 100);
}

/** Returns the projects for staff. */
export async function fetchProjectsForStaff(userId: number, options?: { query?: string | null; moduleId?: number }) {
  const projects = await getStaffProjects(userId, options);
  const now = Date.now();
  return projects.map((project) => {
    const allAllocations = project.teams.flatMap((t) => t.allocations);
    const hasProjectStudents = project._count.projectStudents > 0;
    const membersTotal = hasProjectStudents ? project._count.projectStudents : allAllocations.length;
    const membersConnected = allAllocations.filter((a) => a.user.githubAccount).length;
    const { start, end } = deadlineRangeBounds(project.deadline as Record<string, unknown> | null | undefined);
    const trelloStats = trelloTeamsLinkedStats(project.teams);
    const peerStats = peerAssessmentCompletionStats(project.teams as StaffProjectListTeam[]);
    return {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.module?.name ?? "",
      archivedAt: project.archivedAt ? new Date(project.archivedAt).toISOString() : null,
      teamCount: project.teams.length,
      hasGithubRepo: project._count.githubRepositories > 0,
      daysOld: Math.floor((now - new Date(project.createdAt).getTime()) / 86_400_000),
      membersTotal,
      membersConnected,
      dateRangeStart: start?.toISOString() ?? null,
      dateRangeEnd: end?.toISOString() ?? null,
      githubIntegrationPercent: githubMembersLinkedPercent(membersTotal, membersConnected),
      trelloBoardsLinkedPercent: trelloStats.percent,
      trelloBoardsLinkedCount: trelloStats.linked,
      peerAssessmentsSubmittedPercent: peerStats.percent,
      peerAssessmentsSubmittedCount: peerStats.submitted,
      peerAssessmentsExpectedCount: peerStats.expected,
    };
  });
}

/** Returns the project teams for staff. */
export async function fetchProjectTeamsForStaff(userId: number, projectId: number) {
  const project = await getStaffProjectTeams(userId, projectId);
  if (!project) return null;

  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const viewerAccessLabel = await getStaffViewerModuleAccessLabel(userId, actor?.role ?? "STAFF", project.moduleId);

  const role = actor?.role ?? "STAFF";
  let canManageProjectSettings = role === "ADMIN" || role === "ENTERPRISE_ADMIN";
  if (!canManageProjectSettings && role === "STAFF") {
    const lead = await prisma.moduleLead.findUnique({
      where: { moduleId_userId: { moduleId: project.moduleId, userId } },
      select: { userId: true },
    });
    canManageProjectSettings = Boolean(lead);
  }

  const moduleArchivedAt = project.module?.archivedAt ?? null;
  const projectArchivedAt = project.archivedAt ? new Date(project.archivedAt).toISOString() : null;

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.module?.name ?? "",
      moduleArchivedAt,
      projectArchivedAt,
      viewerAccessLabel,
      canManageProjectSettings,
    },
    teams: project.teams.map((team) => ({
      id: team.id,
      teamName: team.teamName,
      projectId: team.projectId,
      allocationLifecycle: team.allocationLifecycle,
      createdAt: team.createdAt,
      inactivityFlag: team.inactivityFlag,
      deadlineProfile: team.deadlineProfile,
      hasDeadlineOverride: Boolean(team.deadlineOverride),
      trelloBoardId: team.trelloBoardId ?? null,
      allocations: team.allocations,
    })),
  };
}

/** Returns the project marking. */
export async function fetchProjectMarking(userId: number, projectId: number) {
  return getUserProjectMarking(userId, projectId);
}
