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
  seedGithubDemoPath: vi.fn(async () => undefined),
  seedCompletedProjectScenario: vi.fn(async () => undefined),
  seedProjectDeadlines: vi.fn(async () => undefined),
  seedPeerAssessments: vi.fn(async () => undefined),
  seedFeatureFlags: vi.fn(async () => undefined),
  seedPeerAssessmentProgressScenarios: vi.fn(async () => undefined),
  seedForumPosts: vi.fn(async () => undefined),
  seedMeetings: vi.fn(async () => undefined),
  seedNotifications: vi.fn(async () => undefined),
}));

vi.mock("../../prisma/seed/allocation", () => ({
  buildUsersByRole: vi.fn(),
  seedModuleLeads: mocks.seedModuleLeads,
  seedModuleTeachingAssistants: mocks.seedModuleTeachingAssistants,
  seedStudentEnrollments: mocks.seedStudentEnrollments,
  seedAdminTeamAllocation: mocks.seedAdminTeamAllocation,
  seedTeamAllocations: mocks.seedTeamAllocations,
  seedAssessmentStudentModuleCoverage: mocks.seedAssessmentStudentModuleCoverage,
  seedGithubE2EUsers: mocks.seedGithubE2EUsers,
}));

vi.mock("../../prisma/seed/completed-project", () => ({
  seedCompletedProjectScenario: mocks.seedCompletedProjectScenario,
}));

vi.mock("../../prisma/seed/catalog", () => ({
  seedUsers: vi.fn(),
  seedModules: vi.fn(),
  seedQuestionnaireTemplates: vi.fn(),
  seedProjects: vi.fn(),
  seedTeams: vi.fn(),
}));

vi.mock("../../prisma/seed/forum", () => ({
  seedForumPosts: mocks.seedForumPosts,
}));

vi.mock("../../prisma/seed/githubDemo", () => ({
  seedGithubDemoPath: mocks.seedGithubDemoPath,
}));

vi.mock("../../prisma/seed/outcomes", () => ({
  seedStaffStudentMarks: mocks.seedStaffStudentMarks,
  seedProjectDeadlines: mocks.seedProjectDeadlines,
  seedPeerAssessments: mocks.seedPeerAssessments,
  seedFeatureFlags: mocks.seedFeatureFlags,
}));

vi.mock("../../prisma/seed/peer-assessment-scenarios", () => ({
  seedPeerAssessmentProgressScenarios: mocks.seedPeerAssessmentProgressScenarios,
}));

vi.mock("../../prisma/seed/meetings", () => ({
  seedMeetings: mocks.seedMeetings,
}));

vi.mock("../../prisma/seed/notifications", () => ({
  seedNotifications: mocks.seedNotifications,
}));

vi.mock("../../prisma/seed/teamInvites", () => ({
  seedTeamInvites: mocks.seedTeamInvites,
}));

vi.mock("../../prisma/seed/core", () => ({
  seedAdminUser: vi.fn(),
}));

import { buildSeedStepPlan } from "../../prisma/seed/plan";
import type { SeedProfileConfig } from "../../prisma/seed/config";
import type { SeedContext } from "../../prisma/seed/types";

const context: SeedContext = {
  enterprise: { id: "ent-1", code: "ENT", name: "Enterprise" },
  passwordHash: "hash",
  users: [],
  usersByRole: { adminOrStaff: [{ id: 1 } as any], students: [{ id: 2 } as any] },
  modules: [{ id: 10 } as any],
  templates: [{ id: 20, questionLabels: ["Q1"] } as any],
  projects: [{ id: 30, moduleId: 10, templateId: 20 } as any],
  teams: [{ id: 40, projectId: 30 } as any],
};

function config(name: SeedProfileConfig["name"], scenarios: string[]): SeedProfileConfig {
  return {
    name,
    fixtureJoinCodes: false,
    deterministicFixtures: false,
    scenarios: new Set(scenarios as any),
  };
}

describe("seed plan run callbacks", () => {
  it("executes all planned callbacks across profiles", async () => {
    vi.clearAllMocks();

    const profileConfigs: SeedProfileConfig[] = [
      config("dev", ["completedProject", "githubDemo", "staffStudentMarks"]),
      config("demo", ["adminTeamAllocation", "completedProject", "githubDemo", "staffStudentMarks"]),
      config("e2e", ["githubDemo", "staffStudentMarks"]),
      config("trello-e2e", ["adminTeamAllocation", "githubDemo", "staffStudentMarks"]),
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
    expect(mocks.seedGithubDemoPath).toHaveBeenCalled();
    expect(mocks.seedCompletedProjectScenario).toHaveBeenCalled();
    expect(mocks.seedProjectDeadlines).toHaveBeenCalled();
    expect(mocks.seedPeerAssessments).toHaveBeenCalled();
    expect(mocks.seedFeatureFlags).toHaveBeenCalled();
    expect(mocks.seedPeerAssessmentProgressScenarios).toHaveBeenCalled();
    expect(mocks.seedForumPosts).toHaveBeenCalled();
    expect(mocks.seedMeetings).toHaveBeenCalled();
    expect(mocks.seedNotifications).toHaveBeenCalled();
  });
});
