import { describe, expect, it } from "vitest";
import {
  buildSeedStepPlan,
} from "../../../../prisma/seed/plan";
import type { SeedProfileConfig } from "../../../../prisma/seed/config";
import type { SeedContext } from "../../../../prisma/seed/types";

const context: SeedContext = {
  enterprise: { id: "ent-1", code: "ENT", name: "Enterprise" },
  passwordHash: "hashed",
  users: [],
  standardUsers: [],
  assessmentAccounts: [],
  usersByRole: {
    adminOrStaff: [],
    students: [],
  },
  modules: [],
  templates: [],
  projects: [],
  teams: [],
};

function buildConfig(name: SeedProfileConfig["name"], scenarios: SeedProfileConfig["scenarios"]): SeedProfileConfig {
  return {
    name,
    fixtureJoinCodes: name !== "dev",
    deterministicFixtures: name !== "dev",
    scenarios,
  };
}

describe("seed plan", () => {
  it("builds a named dev plan without admin team allocation", () => {
    const config = buildConfig("dev", new Set(["completedProject", "githubDemo", "staffStudentMarks"]));
    const steps = buildSeedStepPlan(context, config);

    expect(steps.map((step) => step.name)).toEqual([
      "seedModuleLeads",
      "seedModuleTeachingAssistants",
      "seedStudentEnrollments",
      "seedTeamAllocations",
      "seedAssessmentStudentModuleCoverage",
      "seedStaffStudentMarks",
      "seedTeamInvites",
      "seedGithubE2EUsers",
      "seedCompletedProjectScenario",
      "seedProjectDeadlines",
      "seedPeerAssessments",
      "seedFeatureFlags",
      "seedPeerAssessmentProgressScenarios",
      "seedTeamHealthWarningScenario",
      "seedForumPosts",
      "seedMeetings",
      "seedNotifications",
      "seedSyncProjectStudentsFromTeamAllocations",
    ]);
  });

  it("builds a demo plan with admin allocation enabled", () => {
    const config = buildConfig("demo", new Set(["adminTeamAllocation", "completedProject", "githubDemo", "staffStudentMarks"]));
    const steps = buildSeedStepPlan(context, config);

    expect(steps.map((step) => step.name)).toContain("seedAdminTeamAllocation");
    expect(steps.find((step) => step.name === "seedAdminTeamAllocation")?.layer).toBe("membership");
  });

  it("builds an e2e plan without completed project scenario by default", () => {
    const config = buildConfig("e2e", new Set(["githubDemo", "staffStudentMarks"]));
    const steps = buildSeedStepPlan(context, config);

    expect(steps.map((step) => step.name)).not.toContain("seedCompletedProjectScenario");
    expect(steps.map((step) => step.name)).not.toContain("seedGithubDemoPath");
    expect(steps.map((step) => step.name)).toContain("seedStaffStudentMarks");
  });

  it("omits optional scenario steps when flags are absent", () => {
    const config = buildConfig("dev", new Set());
    const steps = buildSeedStepPlan(context, config);
    const names = steps.map((step) => step.name);

    expect(names).not.toContain("seedStaffStudentMarks");
    expect(names).not.toContain("seedGithubDemoPath");
  });

  it("builds a trello-e2e plan path", () => {
    const config = buildConfig("trello-e2e", new Set(["adminTeamAllocation", "githubDemo", "staffStudentMarks"]));
    const steps = buildSeedStepPlan(context, config);

    expect(steps.map((step) => step.name)).toContain("seedAdminTeamAllocation");
    expect(steps.map((step) => step.name)).not.toContain("seedCompletedProjectScenario");
  });

  it("keeps profile name independent from step list when scenario config is identical", () => {
    const scenarios = new Set(["adminTeamAllocation", "completedProject", "githubDemo", "staffStudentMarks"]);
    const dev = buildSeedStepPlan(context, buildConfig("dev", scenarios));
    const demo = buildSeedStepPlan(context, buildConfig("demo", scenarios));
    const e2e = buildSeedStepPlan(context, buildConfig("e2e", scenarios));
    const trello = buildSeedStepPlan(context, buildConfig("trello-e2e", scenarios));
    const toNames = (steps: typeof dev) => steps.map((step) => step.name);

    expect(toNames(dev)).toEqual(toNames(demo));
    expect(toNames(dev)).toEqual(toNames(e2e));
    expect(toNames(dev)).toEqual(toNames(trello));
  });
});
