import { prisma } from "../../shared/db.js";
import { assertProjectMutableForWritesByProjectId } from "../../shared/projectWriteGuard.js";
import { addNotification } from "../notifications/service.js";
import {
  getStaffProjectWarningsConfig as getStaffProjectWarningsConfigInDb,
  getProjectWarningsSettings as getProjectWarningsSettingsInDb,
  getProjectTeamWarningSignals as getProjectTeamWarningSignalsInDb,
  getActiveAutoTeamWarningsForProject as getActiveAutoTeamWarningsForProjectInDb,
  resolveTeamWarningById as resolveTeamWarningByIdInDb,
  updateAutoTeamWarningById as updateAutoTeamWarningByIdInDb,
  createTeamWarning,
  getTeamWarningsForTeamInProject,
  updateStaffProjectWarningsConfig as updateStaffProjectWarningsConfigInDb,
  type TeamWarningCreateInput,
} from "./repo.js";
import { getTeamByUserAndProject, getTeamById } from "../projects/repo.js";
import { canStaffAccessTeamInProject } from "../team-health-review/repo.js";
import { evaluateWarningsForTeams, getMaxLookbackDays } from "./evaluator.js";

export type WarningRuleSeverity = "LOW" | "MEDIUM" | "HIGH";

export type ProjectWarningRuleConfig = {
  key: string;
  enabled: boolean;
  severity?: WarningRuleSeverity;
  ttlDays?: number;
  params?: Record<string, unknown>;
};

export type ProjectWarningsConfig = {
  version: 1;
  rules: ProjectWarningRuleConfig[];
};

export type ProjectWarningsEvaluationSummary = {
  projectId: number;
  evaluatedTeams: number;
  createdWarnings: number;
  refreshedWarnings: number;
  expiredWarnings: number;
  resolvedWarnings: number;
  activeAutoWarnings: number;
  skippedRuleKeys: string[];
};

const DEFAULT_PROJECT_WARNINGS_CONFIG: ProjectWarningsConfig = {
  version: 1,
  rules: [
    {
      key: "LOW_ATTENDANCE",
      enabled: true,
      severity: "HIGH",
      params: {
        minPercent: 30,
        lookbackDays: 30,
      },
    },
    {
      key: "MEETING_FREQUENCY",
      enabled: true,
      severity: "MEDIUM",
      params: {
        minPerWeek: 1,
        lookbackDays: 30,
      },
    },
  ],
};

function toConfigClone(config: ProjectWarningsConfig): ProjectWarningsConfig {
  return {
    version: 1,
    rules: config.rules.map((rule) => ({
      key: rule.key,
      enabled: rule.enabled,
      ...(rule.severity ? { severity: rule.severity } : {}),
      ...(typeof rule.ttlDays === "number" ? { ttlDays: rule.ttlDays } : {}),
      ...(rule.params ? { params: { ...rule.params } } : {}),
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseWarningRule(raw: unknown): ProjectWarningRuleConfig | null {
  if (!isRecord(raw)) return null;
  const key = raw.key;
  const enabled = raw.enabled;
  const severity = raw.severity;
  const ttlDays = raw.ttlDays;
  const params = raw.params;

  if (typeof key !== "string" || key.trim().length === 0 || key.length > 64) return null;
  if (typeof enabled !== "boolean") return null;
  if (
    severity !== undefined &&
    severity !== "LOW" &&
    severity !== "MEDIUM" &&
    severity !== "HIGH"
  ) {
    return null;
  }
  if (ttlDays !== undefined) {
    if (typeof ttlDays !== "number" || !Number.isInteger(ttlDays) || ttlDays < 1 || ttlDays > 365) {
      return null;
    }
  }
  if (params !== undefined && !isRecord(params)) return null;

  return {
    key: key.trim(),
    enabled,
    ...(severity ? { severity } : {}),
    ...(typeof ttlDays === "number" ? { ttlDays } : {}),
    ...(params ? { params } : {}),
  };
}

export function parseProjectWarningsConfig(raw: unknown): ProjectWarningsConfig | null {
  if (!isRecord(raw)) return null;
  const version = raw.version;
  const rules = raw.rules;

  if (version !== 1) return null;
  if (!Array.isArray(rules)) return null;
  if (rules.length > 100) return null;

  const parsedRules: ProjectWarningRuleConfig[] = [];
  for (const rule of rules) {
    const parsed = parseWarningRule(rule);
    if (!parsed) return null;
    parsedRules.push(parsed);
  }

  return {
    version: 1,
    rules: parsedRules,
  };
}

export function getDefaultProjectWarningsConfig(): ProjectWarningsConfig {
  return toConfigClone(DEFAULT_PROJECT_WARNINGS_CONFIG);
}

function normalizeProjectWarningsConfig(raw: unknown): ProjectWarningsConfig {
  const parsed = parseProjectWarningsConfig(raw);
  if (!parsed) return getDefaultProjectWarningsConfig();
  return parsed;
}

function toWarningType(ruleKey: string): string {
  if (ruleKey === "LOW_COMMIT_ACTIVITY") return "LOW_CONTRIBUTION_ACTIVITY";
  return ruleKey;
}

function getTtlDaysByWarningType(config: ProjectWarningsConfig): Map<string, number> {
  const ttlByWarningType = new Map<string, number>();
  for (const rule of config.rules) {
    if (!rule.enabled || typeof rule.ttlDays !== "number") continue;
    ttlByWarningType.set(toWarningType(rule.key), rule.ttlDays);
  }
  return ttlByWarningType;
}

function resolveProjectWarningsEndAt(deadline: {
  assessmentDueDate?: Date | null;
  assessmentDueDateMcf?: Date | null;
} | null | undefined): Date | null {
  if (!deadline) return null;
  const candidates = [deadline.assessmentDueDate, deadline.assessmentDueDateMcf]
    .filter((value): value is Date => value instanceof Date);
  if (candidates.length === 0) return null;
  return candidates.reduce((latest, current) => (current.getTime() > latest.getTime() ? current : latest));
}

async function notifyTeamStudentsAboutWarning(
  projectId: number,
  teamId: number,
  title: string,
) {
  const team = await getTeamById(teamId);
  if (!team || team.projectId !== projectId) return;

  const studentIds = team.allocations
    .filter((allocation) => allocation.user.role === "STUDENT")
    .map((allocation) => allocation.userId);
  if (studentIds.length === 0) return;

  await Promise.all(
    studentIds.map((userId) =>
      addNotification({
        userId,
        type: "LOW_ATTENDANCE",
        message: `New team warning: ${title}`,
        link: `/projects/${projectId}/team-health`,
      }),
    ),
  );
}

export async function createTeamWarningForStaff(
  userId: number,
  projectId: number,
  teamId: number,
  payload: Omit<TeamWarningCreateInput, "createdByUserId" | "source">,
) {
  const canAccess = await canStaffAccessTeamInProject(userId, projectId, teamId);
  if (!canAccess) return null;

  await assertProjectMutableForWritesByProjectId(projectId);

  const warning = await createTeamWarning(projectId, teamId, {
    ...payload,
    source: "MANUAL",
    createdByUserId: userId,
  });
  await notifyTeamStudentsAboutWarning(projectId, teamId, warning.title);
  return warning;
}

export async function fetchTeamWarningsForStaff(userId: number, projectId: number, teamId: number) {
  const canAccess = await canStaffAccessTeamInProject(userId, projectId, teamId);
  if (!canAccess) return null;

  await evaluateProjectWarningsForProject(projectId);
  return getTeamWarningsForTeamInProject(projectId, teamId);
}

export async function resolveTeamWarningForStaff(
  userId: number,
  projectId: number,
  teamId: number,
  warningId: number,
) {
  const canAccess = await canStaffAccessTeamInProject(userId, projectId, teamId);
  if (!canAccess) return null;

  await assertProjectMutableForWritesByProjectId(projectId);

  const activeWarnings = await getTeamWarningsForTeamInProject(projectId, teamId, { activeOnly: true });
  const warning = activeWarnings.find((item) => item.id === warningId);
  if (!warning) return null;

  return resolveTeamWarningByIdInDb(warningId);
}

export async function fetchMyTeamWarnings(userId: number, projectId: number) {
  const team = await getTeamByUserAndProject(userId, projectId);
  if (!team) return null;

  await evaluateProjectWarningsForProject(projectId);
  return getTeamWarningsForTeamInProject(projectId, team.id, { activeOnly: true });
}

export async function fetchProjectWarningsConfigForStaff(actorUserId: number, projectId: number) {
  const result = await getStaffProjectWarningsConfigInDb(actorUserId, projectId);
  if (!result) return null;
  return {
    id: result.id,
    hasPersistedWarningsConfig: result.warningsConfig !== null,
    warningsConfig: normalizeProjectWarningsConfig(result.warningsConfig),
  };
}

export async function updateProjectWarningsConfigForStaff(
  actorUserId: number,
  projectId: number,
  rawWarningsConfig: unknown,
) {
  const parsedWarningsConfig = parseProjectWarningsConfig(rawWarningsConfig);
  if (!parsedWarningsConfig) {
    throw {
      code: "INVALID_WARNINGS_CONFIG",
      message: "warningsConfig must be an object with version=1 and a valid rules array",
    };
  }

  const updated = await updateStaffProjectWarningsConfigInDb(actorUserId, projectId, parsedWarningsConfig);
  return {
    id: updated.id,
    hasPersistedWarningsConfig: updated.warningsConfig !== null,
    warningsConfig: normalizeProjectWarningsConfig(updated.warningsConfig),
  };
}

async function evaluateProjectWarningsWithConfig(
  projectId: number,
  rawWarningsConfig: unknown,
): Promise<ProjectWarningsEvaluationSummary> {
  const archiveGate = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      archivedAt: true,
      createdAt: true,
      deadline: {
        select: {
          taskOpenDate: true,
          assessmentDueDate: true,
          assessmentDueDateMcf: true,
        },
      },
      module: { select: { archivedAt: true } },
    },
  });
  if (
    archiveGate &&
    (archiveGate.archivedAt != null || archiveGate.module.archivedAt != null)
  ) {
    return {
      projectId,
      evaluatedTeams: 0,
      createdWarnings: 0,
      refreshedWarnings: 0,
      expiredWarnings: 0,
      resolvedWarnings: 0,
      activeAutoWarnings: 0,
      skippedRuleKeys: [],
    };
  }

  const activeAutoWarnings = await getActiveAutoTeamWarningsForProjectInDb(projectId);
  const normalizedConfig = normalizeProjectWarningsConfig(rawWarningsConfig);
  const hasEnabledRules = normalizedConfig.rules.some((rule) => rule.enabled);
  const now = new Date();
  const warningsEndAt = resolveProjectWarningsEndAt(archiveGate?.deadline);

  if (warningsEndAt && now.getTime() >= warningsEndAt.getTime()) {
    await Promise.all(activeAutoWarnings.map((warning) => resolveTeamWarningByIdInDb(warning.id)));
    return {
      projectId,
      evaluatedTeams: 0,
      createdWarnings: 0,
      refreshedWarnings: 0,
      expiredWarnings: 0,
      resolvedWarnings: activeAutoWarnings.length,
      activeAutoWarnings: 0,
      skippedRuleKeys: [],
    };
  }

  if (!hasEnabledRules) {
    await Promise.all(activeAutoWarnings.map((warning) => resolveTeamWarningByIdInDb(warning.id)));
    return {
      projectId,
      evaluatedTeams: 0,
      createdWarnings: 0,
      refreshedWarnings: 0,
      expiredWarnings: 0,
      resolvedWarnings: activeAutoWarnings.length,
      activeAutoWarnings: 0,
      skippedRuleKeys: [],
    };
  }

  const lookbackDays = getMaxLookbackDays(normalizedConfig);
  const sinceDate = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const teamSignals = await getProjectTeamWarningSignalsInDb(projectId, sinceDate);
  const projectStartDate = archiveGate?.deadline?.taskOpenDate ?? archiveGate?.createdAt ?? null;
  const evaluation = evaluateWarningsForTeams(normalizedConfig, teamSignals, now, projectStartDate);
  const ttlByWarningType = getTtlDaysByWarningType(normalizedConfig);

  const activeByKey = new Map(activeAutoWarnings.map((warning) => [`${warning.teamId}:${warning.type}`, warning]));
  const desiredByKey = new Map(evaluation.warnings.map((warning) => [`${warning.teamId}:${warning.type}`, warning]));

  let resolvedWarnings = 0;
  let expiredWarnings = 0;
  for (const warning of activeAutoWarnings) {
    const key = `${warning.teamId}:${warning.type}`;
    const ttlDays = ttlByWarningType.get(warning.type);
    if (typeof ttlDays === "number") {
      const expiresAt = warning.createdAt.getTime() + ttlDays * 24 * 60 * 60 * 1000;
      if (now.getTime() >= expiresAt) {
        await resolveTeamWarningByIdInDb(warning.id);
        activeByKey.delete(key);
        resolvedWarnings += 1;
        expiredWarnings += 1;
        continue;
      }
    }
    if (desiredByKey.has(key)) continue;
    await resolveTeamWarningByIdInDb(warning.id);
    activeByKey.delete(key);
    resolvedWarnings += 1;
  }

  let refreshedWarnings = 0;
  for (const [key, warning] of desiredByKey.entries()) {
    const activeWarning = activeByKey.get(key);
    if (!activeWarning) continue;

    const detailsChanged =
      activeWarning.severity !== warning.severity ||
      activeWarning.title !== warning.title ||
      activeWarning.details !== warning.details;
    if (!detailsChanged) continue;

    await updateAutoTeamWarningByIdInDb(activeWarning.id, {
      severity: warning.severity,
      title: warning.title,
      details: warning.details,
    });
    refreshedWarnings += 1;
  }

  let createdWarnings = 0;
  for (const [key, warning] of desiredByKey.entries()) {
    if (activeByKey.has(key)) continue;
    const createdWarning = await createTeamWarning(projectId, warning.teamId, {
      type: warning.type,
      severity: warning.severity,
      title: warning.title,
      details: warning.details,
      source: "AUTO",
      createdByUserId: null,
    });
    await notifyTeamStudentsAboutWarning(projectId, warning.teamId, createdWarning.title);
    createdWarnings += 1;
  }

  return {
    projectId,
    evaluatedTeams: teamSignals.length,
    createdWarnings,
    refreshedWarnings,
    expiredWarnings,
    resolvedWarnings,
    activeAutoWarnings: desiredByKey.size,
    skippedRuleKeys: evaluation.skippedRuleKeys,
  };
}

export async function evaluateProjectWarningsForStaff(actorUserId: number, projectId: number) {
  const scopedProject = await getStaffProjectWarningsConfigInDb(actorUserId, projectId);
  if (!scopedProject) return null;
  await assertProjectMutableForWritesByProjectId(projectId);
  return evaluateProjectWarningsWithConfig(projectId, scopedProject.warningsConfig);
}

export async function evaluateProjectWarningsForProject(projectId: number) {
  const project = await getProjectWarningsSettingsInDb(projectId);
  if (!project) return null;
  return evaluateProjectWarningsWithConfig(projectId, project.warningsConfig);
}

export async function evaluateProjectWarningsForAllProjects() {
  const projects = await prisma.project.findMany({
    where: {
      archivedAt: null,
      module: {
        archivedAt: null,
      },
    },
    select: {
      id: true,
    },
  });

  const summaries: ProjectWarningsEvaluationSummary[] = [];
  for (const project of projects) {
    try {
      const summary = await evaluateProjectWarningsForProject(project.id);
      if (summary) summaries.push(summary);
    } catch (error) {
      console.error(`Project warnings evaluation failed for project ${project.id}:`, error);
    }
  }

  return summaries;
}
