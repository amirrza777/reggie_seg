import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  seedModuleLeads: vi.fn(async () => undefined),
  seedModuleTeachingAssistants: vi.fn(async () => undefined),
  seedStudentEnrollments: vi.fn(async () => undefined),
  seedAdminTeamAllocation: vi.fn(async () => undefined),
  seedTeamAllocations: vi.fn(async () => undefined),
  seedAssessmentStudentModuleCoverage: vi.fn(async () => undefined),
  seedStaffStudentMarks: vi.fn(async () => undefined),
  seedTeamInvites: vi.fn(async () => undefined),
  seedGithubE2EUsers: vi.fn(async () => undefined),
  seedCompletedProjectScenario: vi.fn(async () => undefined),
  seedProjectDeadlines: vi.fn(async () => undefined),
  seedPeerAssessments: vi.fn(async () => undefined),
  seedFeatureFlags: vi.fn(async () => undefined),
  seedPeerAssessmentProgressScenarios: vi.fn(async () => undefined),
  seedTeamHealthWarningScenario: vi.fn(async () => undefined),
  seedForumPosts: vi.fn(async () => undefined),
  seedMeetings: vi.fn(async () => undefined),
  seedNotifications: vi.fn(async () => undefined),
}));

vi.mock("../../../../prisma/seed/allocation", () => ({
  buildUsersByRole: vi.fn(),
  seedModuleLeads: mocks.seedModuleLeads,
  seedModuleTeachingAssistants: mocks.seedModuleTeachingAssistants,
  seedStudentEnrollments: mocks.seedStudentEnrollments,
  seedAdminTeamAllocation: mocks.seedAdminTeamAllocation,
  seedTeamAllocations: mocks.seedTeamAllocations,
  seedAssessmentStudentModuleCoverage: mocks.seedAssessmentStudentModuleCoverage,
  seedGithubE2EUsers: mocks.seedGithubE2EUsers,
}));

vi.mock("../../../../prisma/seed/completed-project", () => ({
  seedCompletedProjectScenario: mocks.seedCompletedProjectScenario,
}));

vi.mock("../../../../prisma/seed/catalog", () => ({
  seedUsers: vi.fn(),
  seedModules: vi.fn(),
  seedQuestionnaireTemplates: vi.fn(),
  seedProjects: vi.fn(),
  seedTeams: vi.fn(),
}));

vi.mock("../../../../prisma/seed/steps/forum", () => ({
  seedForumPosts: mocks.seedForumPosts,
}));

vi.mock("../../../../prisma/seed/outcomes", () => ({
  seedStaffStudentMarks: mocks.seedStaffStudentMarks,
  seedProjectDeadlines: mocks.seedProjectDeadlines,
  seedPeerAssessments: mocks.seedPeerAssessments,
  seedFeatureFlags: mocks.seedFeatureFlags,
}));

vi.mock("../../../../prisma/seed/steps/peer-assessment-scenarios", () => ({
  seedPeerAssessmentProgressScenarios: mocks.seedPeerAssessmentProgressScenarios,
}));

vi.mock("../../../../prisma/seed/teamHealthScenario/team-health-warning-scenario", () => ({
  seedTeamHealthWarningScenario: mocks.seedTeamHealthWarningScenario,
}));

vi.mock("../../../../prisma/seed/steps/meetings", () => ({
  seedMeetings: mocks.seedMeetings,
}));

vi.mock("../../../../prisma/seed/steps/notifications", () => ({
  seedNotifications: mocks.seedNotifications,
}));

vi.mock("../../../../prisma/seed/steps/teamInvites", () => ({
  seedTeamInvites: mocks.seedTeamInvites,
}));

vi.mock("../../../../prisma/seed/core", () => ({
  seedAdminUser: vi.fn(),
}));

import { buildSeedStepPlan } from "../../../../prisma/seed/plan";
import type { SeedProfileConfig } from "../../../../prisma/seed/config";
import type { SeedContext } from "../../../../prisma/seed/types";

const context: SeedContext = {
  enterprise: { id: "ent-1", code: "ENT", name: "Enterprise" },
  passwordHash: "hash",
  users: [],
  standardUsers: [],
  assessmentAccounts: [],
  usersByRole: { adminOrStaff: [{ id: 1 } as never], students: [{ id: 2 } as never] },
  modules: [{ id: 10 } as never],
  templates: [{ id: 20, questionLabels: ["Q1"] } as never],
  projects: [{ id: 30, moduleId: 10, templateId: 20 } as never],
  teams: [{ id: 40, projectId: 30 } as never],
};

function config(name: SeedProfileConfig["name"], scenarios: string[]): SeedProfileConfig {
  return {
    name,
    fixtureJoinCodes: false,
    deterministicFixtures: false,
    scenarios: new Set(scenarios as never),
  };
}

describe("seed plan run callbacks", () => {
  it("executes all planned callbacks across profiles", async () => {
    vi.clearAllMocks();

    const profileConfigs: SeedProfileConfig[] = [
      config("dev", ["completedProject", "staffStudentMarks"]),
      config("demo", ["adminTeamAllocation", "completedProject", "staffStudentMarks"]),
      config("e2e", ["staffStudentMarks"]),
      config("trello-e2e", ["adminTeamAllocation", "staffStudentMarks"]),
    ];

    for (const profile of profileConfigs) {
      const steps = buildSeedStepPlan(context, profile);
      for (const step of steps) {
        await step.run();
      }
    }

    expect(mocks.seedModuleLeads).toHaveBeenCalled();
    expect(mocks.seedModuleTeachingAssistants).toHaveBeenCalled();
    expect(mocks.seedStudentEnrollments).toHaveBeenCalled();
    expect(mocks.seedAdminTeamAllocation).toHaveBeenCalled();
    expect(mocks.seedTeamAllocations).toHaveBeenCalled();
    expect(mocks.seedAssessmentStudentModuleCoverage).toHaveBeenCalled();
    expect(mocks.seedStaffStudentMarks).toHaveBeenCalled();
    expect(mocks.seedTeamInvites).toHaveBeenCalled();
    expect(mocks.seedGithubE2EUsers).toHaveBeenCalled();
    expect(mocks.seedCompletedProjectScenario).toHaveBeenCalled();
    expect(mocks.seedProjectDeadlines).toHaveBeenCalled();
    expect(mocks.seedPeerAssessments).toHaveBeenCalled();
    expect(mocks.seedFeatureFlags).toHaveBeenCalled();
    expect(mocks.seedPeerAssessmentProgressScenarios).toHaveBeenCalled();
    expect(mocks.seedTeamHealthWarningScenario).toHaveBeenCalled();
    expect(mocks.seedForumPosts).toHaveBeenCalled();
    expect(mocks.seedMeetings).toHaveBeenCalled();
    expect(mocks.seedNotifications).toHaveBeenCalled();
  });
});
