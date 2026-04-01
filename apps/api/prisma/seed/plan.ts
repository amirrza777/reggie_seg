import {
  buildUsersByRole,
  seedAdminTeamAllocation,
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
import { seedGithubDemoPath } from "./githubDemo";
import { seedFeatureFlags, seedPeerAssessments, seedProjectDeadlines } from "./outcomes";
import { seedPeerAssessmentProgressScenarios } from "./peer-assessment-scenarios";
import { seedMeetings } from "./meetings";
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
  const steps: SeedStepDefinition[] = [
    {
      name: "seedModuleLeads",
      layer: "membership",
      run: () => seedModuleLeads(context.usersByRole.adminOrStaff, context.modules),
    },
    {
      name: "seedModuleTeachingAssistants",
      layer: "membership",
      run: () => seedModuleTeachingAssistants(context.usersByRole.adminOrStaff, context.modules),
    },
    {
      name: "seedStudentEnrollments",
      layer: "membership",
      run: () => seedStudentEnrollments(context.enterprise.id, context.usersByRole.students, context.modules),
    },
  ];

  if (config.scenarios.has("adminTeamAllocation")) {
    steps.push({
      name: "seedAdminTeamAllocation",
      layer: "membership",
      run: () => seedAdminTeamAllocation(context.enterprise.id),
    });
  }

  steps.push({
    name: "seedTeamAllocations",
    layer: "membership",
    run: () => seedTeamAllocations(context.usersByRole.students, context.teams),
  });

  return steps;
}

function buildScenarioSeedPlan(context: SeedContext, config: SeedProfileConfig): SeedStepDefinition[] {
  const steps: SeedStepDefinition[] = [
    {
      name: "seedTeamInvites",
      layer: "scenario",
      run: () => seedTeamInvites(context),
    },
    {
      name: "seedGithubE2EUsers",
      layer: "scenario",
      run: () => seedGithubE2EUsers(context.enterprise.id, context.projects, context.teams),
    },
  ];

  if (config.scenarios.has("githubDemo")) {
    steps.push({
      name: "seedGithubDemoPath",
      layer: "scenario",
      run: () => seedGithubDemoPath(context),
    });
  }

  if (config.scenarios.has("completedProject")) {
    steps.push({
      name: "seedCompletedProjectScenario",
      layer: "scenario",
      run: () => seedCompletedProjectScenario(context),
    });
  }

  steps.push(
    {
      name: "seedProjectDeadlines",
      layer: "scenario",
      run: () => seedProjectDeadlines(context.projects),
    },
    {
      name: "seedPeerAssessments",
      layer: "scenario",
      run: () => seedPeerAssessments(context.projects, context.teams, context.templates),
    },
    {
      name: "seedFeatureFlags",
      layer: "scenario",
      run: () => seedFeatureFlags(context.enterprise.id),
    },
    {
      name: "seedPeerAssessmentProgressScenarios",
      layer: "scenario",
      run: () => seedPeerAssessmentProgressScenarios(context),
    },
    {
      name: "seedForumPosts",
      layer: "scenario",
      run: () => seedForumPosts(context.projects, context.usersByRole.adminOrStaff, context.usersByRole.students),
    },
    {
      name: "seedMeetings",
      layer: "scenario",
      run: () => seedMeetings(context),
    },
    {
      name: "seedNotifications",
      layer: "scenario",
      run: () => seedNotifications(context),
    },
  );

  return steps;
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
