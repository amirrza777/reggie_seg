import {
  getProjectById,
  getUserProjects,
  getModulesForUser,
  createProject as createProjectInDb,
  getTeammatesInProject,
  getUserProjectDeadline,
  getTeamById,
  getTeamByUserAndProject,
  getQuestionsForProject,
  getStaffProjects,
  getStaffProjectTeams,
  getStaffStudentDeadlineOverrides,
  getUserProjectMarking,
  createTeamHealthMessage,
  getTeamHealthMessagesForUserInProject,
  getTeamHealthMessagesForTeamInProject,
  getStaffProjectWarningsConfig as getStaffProjectWarningsConfigInDb,
  getProjectWarningsSettings as getProjectWarningsSettingsInDb,
  getProjectTeamWarningSignals as getProjectTeamWarningSignalsInDb,
  getActiveAutoTeamWarningsForProject as getActiveAutoTeamWarningsForProjectInDb,
  resolveTeamWarningById as resolveTeamWarningByIdInDb,
  updateAutoTeamWarningById as updateAutoTeamWarningByIdInDb,
  createTeamWarning,
  getTeamWarningsForTeamInProject,
  canStaffAccessTeamInProject,
  updateStaffTeamDeadlineProfile as updateStaffTeamDeadlineProfileInDb,
  updateStaffProjectWarningsConfig as updateStaffProjectWarningsConfigInDb,
  upsertStaffStudentDeadlineOverride as upsertStaffStudentDeadlineOverrideInDb,
  clearStaffStudentDeadlineOverride as clearStaffStudentDeadlineOverrideInDb,
  type ProjectDeadlineInput,
  type TeamWarningCreateInput,
  type StudentDeadlineOverrideInput,
} from "./repo.js";
import { evaluateWarningsForTeams, getMaxLookbackDays } from "./warnings/evaluator.js";

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

/** Creates a project. */
export async function createProject(
  actorUserId: number,
  name: string,
  moduleId: number,
  questionnaireTemplateId: number,
  informationText: string | null,
  deadline: ProjectDeadlineInput,
) {
  return createProjectInDb(
    actorUserId,
    name,
    moduleId,
    questionnaireTemplateId,
    informationText,
    deadline,
  );
}

/** Returns the project by ID. */
export async function fetchProjectById(projectId: number) {
  return getProjectById(projectId);
}

/** Returns the projects for user. */
export async function fetchProjectsForUser(userId: number) {
  const projects = await getUserProjects(userId);
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    moduleName: project.module?.name ?? "",
    archivedAt: project.archivedAt ?? null,
  }));
}

/** Returns the modules for user. */
export async function fetchModulesForUser(
  userId: number,
  options?: { staffOnly?: boolean; compact?: boolean; query?: string | null },
) {
  const modules = await getModulesForUser(userId, options);
  return modules.map((module) => ({
    id: String(module.id),
    title: module.name,
    briefText: "briefText" in module ? module.briefText ?? undefined : undefined,
    timelineText: "timelineText" in module ? module.timelineText ?? undefined : undefined,
    expectationsText: "expectationsText" in module ? module.expectationsText ?? undefined : undefined,
    readinessNotesText: "readinessNotesText" in module ? module.readinessNotesText ?? undefined : undefined,
    teamCount: "teamCount" in module ? module.teamCount : 0,
    projectCount: "projectCount" in module ? module.projectCount : 0,
    accountRole: module.accessRole,
  }));
}

/** Returns the teammates for project. */
export async function fetchTeammatesForProject(userId: number, projectId: number) {
  return getTeammatesInProject(userId, projectId);
}

/** Returns the project deadline. */
export async function fetchProjectDeadline(userId: number, projectId: number) {
  return getUserProjectDeadline(userId, projectId);
}

/** Returns the team by ID. */
export async function fetchTeamById(teamId: number) {
  return getTeamById(teamId);
}

/** Returns the team by user and project. */
export async function fetchTeamByUserAndProject(userId: number, projectId: number) {
  return getTeamByUserAndProject(userId, projectId);
}

/** Returns the questions for project. */
export async function fetchQuestionsForProject(projectId: number) {
  return getQuestionsForProject(projectId);
}

/** Returns the projects for staff. */
export async function fetchProjectsForStaff(userId: number, options?: { query?: string | null }) {
  const projects = await getStaffProjects(userId, options);
  const now = Date.now();
  return projects.map((project) => {
    const allAllocations = project.teams.flatMap((t) => t.allocations);
    const membersTotal = allAllocations.length;
    const membersConnected = allAllocations.filter((a) => a.user.githubAccount).length;
    return {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.module?.name ?? "",
      teamCount: project.teams.length,
      hasGithubRepo: project._count.githubRepositories > 0,
      daysOld: Math.floor((now - new Date(project.createdAt).getTime()) / 86_400_000),
      membersTotal,
      membersConnected,
    };
  });
}

/** Returns the project teams for staff. */
export async function fetchProjectTeamsForStaff(userId: number, projectId: number) {
  const project = await getStaffProjectTeams(userId, projectId);
  if (!project) return null;

  return {
    project: {
      id: project.id,
      name: project.name,
      moduleId: project.moduleId,
      moduleName: project.module?.name ?? "",
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
      allocations: team.allocations,
    })),
  };
}

/** Returns the project marking. */
export async function fetchProjectMarking(userId: number, projectId: number) {
  return getUserProjectMarking(userId, projectId);
}

export async function submitTeamHealthMessage(
  userId: number,
  projectId: number,
  subject: string,
  details: string
) {
  const team = await getTeamByUserAndProject(userId, projectId);
  if (!team) return null;

  return createTeamHealthMessage(projectId, team.id, userId, subject, details);
}

export async function fetchMyTeamHealthMessages(userId: number, projectId: number) {
  const team = await getTeamByUserAndProject(userId, projectId);
  if (!team) return null;

  return getTeamHealthMessagesForUserInProject(projectId, userId);
}

export async function fetchTeamHealthMessagesForStaff(userId: number, projectId: number, teamId: number) {
  const canAccess = await canStaffAccessTeamInProject(userId, projectId, teamId);
  if (!canAccess) return null;

  return getTeamHealthMessagesForTeamInProject(projectId, teamId);
}

export async function createTeamWarningForStaff(
  userId: number,
  projectId: number,
  teamId: number,
  payload: Omit<TeamWarningCreateInput, "createdByUserId" | "source">,
) {
  const canAccess = await canStaffAccessTeamInProject(userId, projectId, teamId);
  if (!canAccess) return null;

  return createTeamWarning(projectId, teamId, {
    ...payload,
    source: "MANUAL",
    createdByUserId: userId,
  });
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

export async function updateTeamDeadlineProfileForStaff(
  actorUserId: number,
  teamId: number,
  deadlineProfile: "STANDARD" | "MCF",
) {
  return updateStaffTeamDeadlineProfileInDb(actorUserId, teamId, deadlineProfile);
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
  const activeAutoWarnings = await getActiveAutoTeamWarningsForProjectInDb(projectId);
  const normalizedConfig = normalizeProjectWarningsConfig(rawWarningsConfig);
  const hasEnabledRules = normalizedConfig.rules.some((rule) => rule.enabled);

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
  const sinceDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const teamSignals = await getProjectTeamWarningSignalsInDb(projectId, sinceDate);
  const evaluation = evaluateWarningsForTeams(normalizedConfig, teamSignals);
  const ttlByWarningType = getTtlDaysByWarningType(normalizedConfig);
  const now = new Date();

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
    await createTeamWarning(projectId, warning.teamId, {
      type: warning.type,
      severity: warning.severity,
      title: warning.title,
      details: warning.details,
      source: "AUTO",
      createdByUserId: null,
    });
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
  return evaluateProjectWarningsWithConfig(projectId, scopedProject.warningsConfig);
}

export async function evaluateProjectWarningsForProject(projectId: number) {
  const project = await getProjectWarningsSettingsInDb(projectId);
  if (!project) return null;
  return evaluateProjectWarningsWithConfig(projectId, project.warningsConfig);
}

export async function fetchStaffStudentDeadlineOverrides(actorUserId: number, projectId: number) {
  return getStaffStudentDeadlineOverrides(actorUserId, projectId);
}

export async function upsertStaffStudentDeadlineOverride(
  actorUserId: number,
  projectId: number,
  studentId: number,
  payload: StudentDeadlineOverrideInput,
) {
  return upsertStaffStudentDeadlineOverrideInDb(actorUserId, projectId, studentId, payload);
}

export async function clearStaffStudentDeadlineOverride(
  actorUserId: number,
  projectId: number,
  studentId: number,
) {
  return clearStaffStudentDeadlineOverrideInDb(actorUserId, projectId, studentId);
}
