import type { EnterpriseOverview } from "../types";

type RequestState = "idle" | "loading" | "success" | "error";
type ActionQueueTone = "critical" | "attention" | "healthy";

type ActionQueueItem = {
  id: string;
  label: string;
  detail: string;
  tone: ActionQueueTone;
  href: string;
  cta: string;
  impact: number;
};

type PriorityBanner = {
  tone: "success" | "error";
  text: string;
};

type OverviewValue = {
  label: string;
  value: number;
};

type RoleDistributionItem = {
  label: string;
  value: number;
  percent: number;
};

type ChecklistItem = {
  label: string;
  complete: boolean;
  pending: number;
};

type HealthCheck = {
  label: string;
  value: string;
  detail: string;
};

type OperationalRatio = {
  label: string;
  value: string;
  detail: string;
};

export type EnterpriseOverviewSummaryView = {
  riskItems: OverviewValue[];
  quickHealthChecks: HealthCheck[];
  operationalRatios: OperationalRatio[];
  actionQueue: ActionQueueItem[];
  priorityActionCount: number;
  roleDistribution: RoleDistributionItem[];
  setupChecklist: ChecklistItem[];
  completedChecklistItems: number;
  lastUpdatedLabel: string | null;
  priorityBanner: PriorityBanner;
};

export function buildEnterpriseOverviewSummaryView(
  overview: EnterpriseOverview | null,
  status: RequestState,
  message: string | null,
  loadedAt: Date | null
): EnterpriseOverviewSummaryView {
  const riskItems = buildRiskItems(overview);
  const quickHealthChecks = buildQuickHealthChecks(overview);
  const operationalRatios = buildOperationalRatios(overview);
  const actionQueue = buildActionQueue(overview);
  const priorityActionCount = actionQueue.filter((item) => item.tone !== "healthy").length;
  const roleDistribution = buildRoleDistribution(overview);
  const setupChecklist = buildSetupChecklist(overview);
  const completedChecklistItems = setupChecklist.reduce((count, item) => count + (item.complete ? 1 : 0), 0);
  const lastUpdatedLabel = loadedAt ? loadedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null;
  const priorityBanner = buildPriorityBanner(status, message, riskItems);

  return {
    riskItems,
    quickHealthChecks,
    operationalRatios,
    actionQueue,
    priorityActionCount,
    roleDistribution,
    setupChecklist,
    completedChecklistItems,
    lastUpdatedLabel,
    priorityBanner,
  };
}

function buildRiskItems(overview: EnterpriseOverview | null): OverviewValue[] {
  if (!overview) {return [];}

  const items: OverviewValue[] = [
    { label: "Inactive accounts to review", value: overview.hygiene.inactiveUsers },
    { label: "Students not assigned to a module", value: overview.hygiene.studentsWithoutModule },
    { label: "Modules with no students", value: overview.hygiene.modulesWithoutStudents },
  ];

  return items.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
}

function buildQuickHealthChecks(overview: EnterpriseOverview | null): HealthCheck[] {
  if (!overview) {return [];}

  const studentsAssigned = Math.max(overview.totals.students - overview.hygiene.studentsWithoutModule, 0);
  const modulesWithStudents = Math.max(overview.totals.modules - overview.hygiene.modulesWithoutStudents, 0);

  return [
    {
      label: "Active account rate",
      value: formatPercent(overview.totals.activeUsers, overview.totals.users),
      detail: `${overview.totals.activeUsers}/${overview.totals.users} active`,
    },
    {
      label: "Student module coverage",
      value: formatPercent(studentsAssigned, overview.totals.students),
      detail: `${studentsAssigned}/${overview.totals.students} assigned`,
    },
    {
      label: "Module utilization",
      value: formatPercent(modulesWithStudents, overview.totals.modules),
      detail: `${modulesWithStudents}/${overview.totals.modules} with students`,
    },
  ];
}

function buildOperationalRatios(overview: EnterpriseOverview | null): OperationalRatio[] {
  if (!overview) {return [];}

  const studentsAssigned = Math.max(overview.totals.students - overview.hygiene.studentsWithoutModule, 0);
  const modulesWithStudents = Math.max(overview.totals.modules - overview.hygiene.modulesWithoutStudents, 0);
  const enterpriseLeads = overview.totals.enterpriseAdmins;

  return [
    {
      label: "Students / active module",
      value: formatDecimalRatio(studentsAssigned, modulesWithStudents),
      detail: `${studentsAssigned} students across ${modulesWithStudents} active modules`,
    },
    {
      label: "Students / team",
      value: formatDecimalRatio(overview.totals.students, overview.totals.teams),
      detail: `${overview.totals.students} students across ${overview.totals.teams} teams`,
    },
    {
      label: "Active users / enterprise admin",
      value: formatDecimalRatio(overview.totals.activeUsers, enterpriseLeads),
      detail: `${overview.totals.activeUsers} active users across ${enterpriseLeads} enterprise admins`,
    },
  ];
}

function buildActionQueue(overview: EnterpriseOverview | null): ActionQueueItem[] {
  if (!overview) {return [];}

  const context = buildActionQueueContext(overview);
  const actions = [...buildCriticalActions(context), ...buildAttentionActions(context)];
  const withFallback = actions.length > 0 ? actions : [buildHealthyAction()];
  return rankActionQueue(withFallback);
}

type ActionQueueContext = {
  users: number;
  activeUsers: number;
  students: number;
  teams: number;
  modules: number;
  enterpriseAdmins: number;
  inactiveUsers: number;
  studentsWithoutModule: number;
  modulesWithoutStudents: number;
  newUsers30d: number;
  newModules30d: number;
  activeAccountRate: number;
};

function buildActionQueueContext(overview: EnterpriseOverview): ActionQueueContext {
  const users = overview.totals.users;
  const activeUsers = overview.totals.activeUsers;
  return {
    users,
    activeUsers,
    students: overview.totals.students,
    teams: overview.totals.teams,
    modules: overview.totals.modules,
    enterpriseAdmins: overview.totals.enterpriseAdmins,
    inactiveUsers: overview.hygiene.inactiveUsers,
    studentsWithoutModule: overview.hygiene.studentsWithoutModule,
    modulesWithoutStudents: overview.hygiene.modulesWithoutStudents,
    newUsers30d: overview.trends.newUsers30d,
    newModules30d: overview.trends.newModules30d,
    activeAccountRate: users > 0 ? activeUsers / users : 1,
  };
}

function buildCriticalActions(context: ActionQueueContext): ActionQueueItem[] {
  const actions: ActionQueueItem[] = [];
  if (context.studentsWithoutModule > 0) {actions.push(buildStudentsUnassignedAction(context.studentsWithoutModule));}
  if (context.teams === 0 && context.students > 0) {actions.push(buildMissingTeamsAction(context.students));}
  if (context.enterpriseAdmins === 0) {actions.push(buildMissingAdminOwnershipAction(context.activeUsers));}
  return actions;
}

function buildAttentionActions(context: ActionQueueContext): ActionQueueItem[] {
  const actions: ActionQueueItem[] = [];
  if (context.modulesWithoutStudents > 0) {actions.push(buildEmptyModulesAction(context.modulesWithoutStudents));}
  if (context.inactiveUsers > 0) {actions.push(buildInactiveAccountsAction(context.inactiveUsers));}
  if (context.activeAccountRate < 0.9 && context.users > 0) {actions.push(buildActivationRateAction(context.activeUsers, context.users));}
  if (context.newUsers30d >= 8 && context.newModules30d === 0 && context.modules > 0) {actions.push(buildCapacityGrowthAction(context.newUsers30d));}
  return actions;
}

function buildStudentsUnassignedAction(studentsWithoutModule: number): ActionQueueItem {
  return {
    id: "students-unassigned",
    label: "Assign unplaced students",
    detail: `${studentsWithoutModule} students are not assigned to any module.`,
    tone: "critical",
    href: "/enterprise/modules",
    cta: "Assign students",
    impact: studentsWithoutModule,
  };
}

function buildMissingTeamsAction(students: number): ActionQueueItem {
  return {
    id: "teams-missing",
    label: "Create team structure",
    detail: `${students} students exist, but no teams are configured yet.`,
    tone: "critical",
    href: "/enterprise/modules",
    cta: "Open modules",
    impact: students,
  };
}

function buildMissingAdminOwnershipAction(activeUsers: number): ActionQueueItem {
  return {
    id: "admin-ownership",
    label: "Assign enterprise admin ownership",
    detail: "No enterprise admins are assigned for governance and approvals.",
    tone: "critical",
    href: "/admin/enterprises",
    cta: "Open admin",
    impact: activeUsers,
  };
}

function buildEmptyModulesAction(modulesWithoutStudents: number): ActionQueueItem {
  return {
    id: "empty-modules",
    label: "Resolve empty modules",
    detail: `${modulesWithoutStudents} modules have no students and need enrollment or cleanup.`,
    tone: "attention",
    href: "/enterprise/modules",
    cta: "Review modules",
    impact: modulesWithoutStudents,
  };
}

function buildInactiveAccountsAction(inactiveUsers: number): ActionQueueItem {
  return {
    id: "inactive-accounts",
    label: "Follow up inactive accounts",
    detail: `${inactiveUsers} users are inactive and may need access or onboarding support.`,
    tone: "attention",
    href: "/staff/dashboard",
    cta: "Review analytics",
    impact: inactiveUsers,
  };
}

function buildActivationRateAction(activeUsers: number, users: number): ActionQueueItem {
  return {
    id: "activation-rate",
    label: "Lift account activation rate",
    detail: `Only ${formatPercent(activeUsers, users)} of users are active right now.`,
    tone: "attention",
    href: "/staff/dashboard",
    cta: "Investigate",
    impact: Math.max(users - activeUsers, 0),
  };
}

function buildCapacityGrowthAction(newUsers30d: number): ActionQueueItem {
  return {
    id: "capacity-growth",
    label: "Plan module capacity for growth",
    detail: `${newUsers30d} new users joined in 30 days, but module count did not increase.`,
    tone: "attention",
    href: "/enterprise/modules",
    cta: "Plan capacity",
    impact: newUsers30d,
  };
}

function buildHealthyAction(): ActionQueueItem {
  return {
    id: "healthy-system",
    label: "No immediate blockers",
    detail: "Coverage, activation, and team setup currently look healthy.",
    tone: "healthy",
    href: "/enterprise/modules",
    cta: "Open modules",
    impact: 0,
  };
}

function rankActionQueue(actions: ActionQueueItem[]): ActionQueueItem[] {
  const tonePriority: Record<ActionQueueTone, number> = { critical: 0, attention: 1, healthy: 2 };
  return actions.sort((a, b) => tonePriority[a.tone] - tonePriority[b.tone] || b.impact - a.impact).slice(0, 5);
}

function buildRoleDistribution(overview: EnterpriseOverview | null): RoleDistributionItem[] {
  if (!overview) {return [];}

  const roles = [
    { label: "Students", value: overview.totals.students },
    { label: "Staff", value: overview.totals.staff },
    { label: "Enterprise admins", value: overview.totals.enterpriseAdmins },
  ];
  const total = roles.reduce((sum, role) => sum + role.value, 0);

  return roles.map((role) => ({
    ...role,
    percent: total > 0 ? Math.round((role.value / total) * 100) : 0,
  }));
}

function buildSetupChecklist(overview: EnterpriseOverview | null): ChecklistItem[] {
  if (!overview) {return [];}

  return [
    {
      label: "Students assigned to modules",
      complete: overview.hygiene.studentsWithoutModule === 0,
      pending: overview.hygiene.studentsWithoutModule,
    },
    {
      label: "Modules have enrolled students",
      complete: overview.hygiene.modulesWithoutStudents === 0,
      pending: overview.hygiene.modulesWithoutStudents,
    },
    {
      label: "All accounts are active",
      complete: overview.hygiene.inactiveUsers === 0,
      pending: overview.hygiene.inactiveUsers,
    },
    {
      label: "Teams set up",
      complete: overview.totals.teams > 0,
      pending: overview.totals.teams > 0 ? 0 : 1,
    },
  ];
}

function buildPriorityBanner(status: RequestState, message: string | null, riskItems: OverviewValue[]): PriorityBanner {
  if (status === "loading") {
    return { tone: "success", text: "Scanning enterprise setup risks..." };
  }

  if (status === "error") {
    return { tone: "error", text: message ?? "Could not evaluate enterprise setup risks." };
  }

  if (riskItems.length === 0) {
    return { tone: "success", text: "No priority risks detected. Enterprise setup looks healthy." };
  }

  const highestRisk = riskItems[0];
  const extraRisks = riskItems.length - 1;
  return {
    tone: "error",
    text:
      extraRisks > 0
        ? `Priority: ${highestRisk.label} (${highestRisk.value}). Plus ${extraRisks} additional risk areas.`
        : `Priority: ${highestRisk.label} (${highestRisk.value}).`,
  };
}

function formatPercent(value: number, total: number): string {
  if (total <= 0) {return "0%";}
  return `${Math.round((value / total) * 100)}%`;
}

function formatDecimalRatio(value: number, total: number): string {
  if (total <= 0) {return "0.0";}
  return (value / total).toFixed(1);
}
