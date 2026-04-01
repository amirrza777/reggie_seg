import { describe, expect, it } from "vitest";
import {
  buildDemoSeedPlan,
  buildDevSeedPlan,
  buildE2ESeedPlan,
  buildSeedStepPlan,
  buildTrelloE2ESeedPlan,
} from "../../prisma/seed/plan";
import type { SeedProfileConfig } from "../../prisma/seed/config";
import type { SeedContext } from "../../prisma/seed/types";

const context: SeedContext = {
  enterprise: { id: "ent-1", code: "ENT", name: "Enterprise" },
  passwordHash: "hashed",
  users: [],
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
      "seedGithubDemoPath",
      "seedCompletedProjectScenario",
      "seedProjectDeadlines",
      "seedPeerAssessments",
      "seedFeatureFlags",
      "seedPeerAssessmentProgressScenarios",
      "seedForumPosts",
      "seedMeetings",
      "seedNotifications",
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
    expect(steps.map((step) => step.name)).toContain("seedGithubDemoPath");
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

  it("exports concrete profile builders with consistent step counts", () => {
    const dev = buildDevSeedPlan(context, buildConfig("dev", new Set(["githubDemo", "staffStudentMarks"])));
    const demo = buildDemoSeedPlan(
      context,
      buildConfig("demo", new Set(["adminTeamAllocation", "completedProject", "githubDemo", "staffStudentMarks"])),
    );
    const e2e = buildE2ESeedPlan(context, buildConfig("e2e", new Set(["githubDemo", "staffStudentMarks"])));
    const trello = buildTrelloE2ESeedPlan(
      context,
      buildConfig("trello-e2e", new Set(["adminTeamAllocation", "githubDemo", "staffStudentMarks"])),
    );

    expect(dev.length).toBeGreaterThan(0);
    expect(demo.length).toBeGreaterThan(dev.length);
    expect(e2e.length).toBeGreaterThan(0);
    expect(trello.length).toBeGreaterThan(0);
  });
});
