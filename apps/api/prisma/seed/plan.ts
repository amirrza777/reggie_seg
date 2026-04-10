import {
  buildUsersByRole,
  seedAdminTeamAllocation,
  seedAssessmentStudentModuleCoverage,
  seedGithubE2EUsers,
  seedModuleTeachingAssistants,
  seedModuleLeads,
  seedStudentEnrollments,
  seedTeamAllocations,
} from "./allocation";
import { seedCompletedProjectScenario } from "./completed-project";
import { seedModules, seedProjects, seedQuestionnaireTemplates, seedTeams, seedUsers } from "./catalog";
import type { SeedProfileConfig } from "./config";
import type { SeedContext, SeedEnterprise } from "./types";
import { seedForumPosts } from "./forum";
import { seedFeatureFlags, seedPeerAssessments, seedProjectDeadlines, seedStaffStudentMarks } from "./outcomes";
import { seedPeerAssessmentProgressScenarios } from "./peer-assessment-scenarios";
import { seedMeetings } from "./meetings";
import { seedTeamHealthWarningScenario } from "./team-health-warning-scenario";
import { seedNotifications } from "./notifications";
import { seedTeamInvites } from "./teamInvites";
import { seedAdminUser } from "./core";

export type SeedPlanLayer = "core" | "membership" | "scenario";

export type SeedStepDefinition = {
  name: string;
  layer: SeedPlanLayer;
  run: () => Promise<unknown>;
};

export async function buildSeedContext(enterprise: SeedEnterprise, passwordHash: string): Promise<SeedContext> {
  await seedAdminUser(enterprise.id);
  const users = await seedUsers(enterprise.id, passwordHash);
  const usersByRole = buildUsersByRole(users);
  const modules = await seedModules(enterprise.id);
  const templateOwner = usersByRole.adminOrStaff[0];
  const templates = await seedQuestionnaireTemplates(templateOwner?.id);
  const projects = await seedProjects(modules, templates);
  const teams = await seedTeams(enterprise.id, projects);

  return {
    enterprise,
    passwordHash,
    users,
    usersByRole,
    modules,
    templates,
    projects,
    teams,
  };
}

function buildCoreSeedPlan(_context: SeedContext): SeedStepDefinition[] {
  return [];
}

function buildMembershipSeedPlan(context: SeedContext, config: SeedProfileConfig): SeedStepDefinition[] {
  const steps = [
    buildModuleLeadsStep(context),
    buildModuleTeachingAssistantsStep(context),
    buildStudentEnrollmentsStep(context),
    ...buildAdminTeamAllocationStep(context, config),
    buildTeamAllocationsStep(context),
    buildAssessmentStudentModuleCoverageStep(context),
  ];
  return steps;
}

function buildScenarioSeedPlan(context: SeedContext, config: SeedProfileConfig): SeedStepDefinition[] {
  return [
    ...buildStaffStudentMarksStep(context, config),
    buildTeamInvitesStep(context),
    buildGithubE2EUsersStep(context),
    ...buildCompletedProjectStep(context, config),
    buildProjectDeadlinesStep(context),
    buildPeerAssessmentsStep(context),
    buildFeatureFlagsStep(context),
    buildPeerAssessmentProgressScenariosStep(context),
    buildTeamHealthWarningScenarioStep(context),
    buildForumPostsStep(context),
    buildMeetingsStep(context),
    buildNotificationsStep(context),
  ];
}

export function buildDevSeedPlan(context: SeedContext, config: SeedProfileConfig) {
  return [...buildCoreSeedPlan(context), ...buildMembershipSeedPlan(context, config), ...buildScenarioSeedPlan(context, config)];
}

export function buildDemoSeedPlan(context: SeedContext, config: SeedProfileConfig) {
  return [...buildCoreSeedPlan(context), ...buildMembershipSeedPlan(context, config), ...buildScenarioSeedPlan(context, config)];
}

export function buildE2ESeedPlan(context: SeedContext, config: SeedProfileConfig) {
  return [...buildCoreSeedPlan(context), ...buildMembershipSeedPlan(context, config), ...buildScenarioSeedPlan(context, config)];
}

export function buildTrelloE2ESeedPlan(context: SeedContext, config: SeedProfileConfig) {
  return [...buildCoreSeedPlan(context), ...buildMembershipSeedPlan(context, config), ...buildScenarioSeedPlan(context, config)];
}

export function buildSeedStepPlan(context: SeedContext, config: SeedProfileConfig) {
  switch (config.name) {
    case "demo":
      return buildDemoSeedPlan(context, config);
    case "e2e":
      return buildE2ESeedPlan(context, config);
    case "trello-e2e":
      return buildTrelloE2ESeedPlan(context, config);
    case "dev":
    default:
      return buildDevSeedPlan(context, config);
  }
}

function buildMembershipStep(name: string, run: () => Promise<unknown>): SeedStepDefinition {
  return { name, layer: "membership", run };
}

function buildScenarioStep(name: string, run: () => Promise<unknown>): SeedStepDefinition {
  return { name, layer: "scenario", run };
}

function buildModuleLeadsStep(context: SeedContext) {
  return buildMembershipStep("seedModuleLeads", () => seedModuleLeads(context.usersByRole.adminOrStaff, context.modules));
}

function buildModuleTeachingAssistantsStep(context: SeedContext) {
  return buildMembershipStep("seedModuleTeachingAssistants", () =>
    seedModuleTeachingAssistants(context.usersByRole.adminOrStaff, context.modules)
  );
}

function buildStudentEnrollmentsStep(context: SeedContext) {
  return buildMembershipStep("seedStudentEnrollments", () =>
    seedStudentEnrollments(context.enterprise.id, context.usersByRole.students, context.modules)
  );
}

function buildAdminTeamAllocationStep(context: SeedContext, config: SeedProfileConfig) {
  if (!config.scenarios.has("adminTeamAllocation")) return [];
  return [buildMembershipStep("seedAdminTeamAllocation", () => seedAdminTeamAllocation(context.enterprise.id))];
}

function buildTeamAllocationsStep(context: SeedContext) {
  return buildMembershipStep("seedTeamAllocations", () => seedTeamAllocations(context.usersByRole.students, context.teams));
}

function buildAssessmentStudentModuleCoverageStep(context: SeedContext) {
  return buildMembershipStep("seedAssessmentStudentModuleCoverage", () =>
    seedAssessmentStudentModuleCoverage(context.enterprise.id, context.modules, context.projects, context.teams)
  );
}

function buildStaffStudentMarksStep(context: SeedContext, config: SeedProfileConfig) {
  if (!config.scenarios.has("staffStudentMarks")) return [];
  return [buildScenarioStep("seedStaffStudentMarks", () => seedStaffStudentMarks(context))];
}

function buildTeamInvitesStep(context: SeedContext) {
  return buildScenarioStep("seedTeamInvites", () => seedTeamInvites(context));
}

function buildGithubE2EUsersStep(context: SeedContext) {
  return buildScenarioStep("seedGithubE2EUsers", () => seedGithubE2EUsers(context.enterprise.id, context.projects, context.teams));
}

function buildCompletedProjectStep(context: SeedContext, config: SeedProfileConfig) {
  if (!config.scenarios.has("completedProject")) return [];
  return [buildScenarioStep("seedCompletedProjectScenario", () => seedCompletedProjectScenario(context))];
}

function buildProjectDeadlinesStep(context: SeedContext) {
  return buildScenarioStep("seedProjectDeadlines", () => seedProjectDeadlines(context.projects));
}

function buildPeerAssessmentsStep(context: SeedContext) {
  return buildScenarioStep("seedPeerAssessments", () => seedPeerAssessments(context.projects, context.teams, context.templates));
}

function buildFeatureFlagsStep(context: SeedContext) {
  return buildScenarioStep("seedFeatureFlags", () => seedFeatureFlags(context.enterprise.id));
}

function buildPeerAssessmentProgressScenariosStep(context: SeedContext) {
  return buildScenarioStep("seedPeerAssessmentProgressScenarios", () => seedPeerAssessmentProgressScenarios(context));
}

function buildTeamHealthWarningScenarioStep(context: SeedContext) {
  return buildScenarioStep("seedTeamHealthWarningScenario", () => seedTeamHealthWarningScenario(context));
}

function buildForumPostsStep(context: SeedContext) {
  return buildScenarioStep("seedForumPosts", () =>
    seedForumPosts(context.projects, context.usersByRole.adminOrStaff, context.usersByRole.students)
  );
}

function buildMeetingsStep(context: SeedContext) {
  return buildScenarioStep("seedMeetings", () => seedMeetings(context));
}

function buildNotificationsStep(context: SeedContext) {
  return buildScenarioStep("seedNotifications", () => seedNotifications(context));
}
