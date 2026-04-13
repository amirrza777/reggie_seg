import { describe, expect, it, vi } from "vitest";

const { mockFns } = vi.hoisted(() => ({
  mockFns: {
    seedAdminUser: vi.fn(async () => undefined),
    seedUsers: vi.fn(async () => [
      { id: 1, role: "STAFF", email: "staff1@example.com" },
      { id: 2, role: "STUDENT", email: "student1@example.com" },
      { id: 3, role: "STUDENT", email: "student.assessment@example.com" },
    ]),
    seedModules: vi.fn(async () => [{ id: 10 }]),
    seedQuestionnaireTemplates: vi.fn(async () => [{ id: 100, questionLabels: ["Q1"] }]),
    seedProjects: vi.fn(async () => [{ id: 1000, moduleId: 10, templateId: 100 }]),
    seedTeams: vi.fn(async () => [{ id: 2000, projectId: 1000 }]),
    buildUsersByRole: vi.fn((users: { id: number }[]) => ({
      adminOrStaff: [{ id: 1, role: "STAFF" }],
      students: users.filter((user) => user.id === 2).map((user) => ({ id: user.id, role: "STUDENT" })),
    })),
  },
}));

vi.mock("../../../../prisma/seed/core", () => ({
  seedAdminUser: mockFns.seedAdminUser,
}));

vi.mock("../../../../prisma/seed/catalog", () => ({
  seedUsers: mockFns.seedUsers,
  seedModules: mockFns.seedModules,
  seedQuestionnaireTemplates: mockFns.seedQuestionnaireTemplates,
  seedProjects: mockFns.seedProjects,
  seedTeams: mockFns.seedTeams,
}));

vi.mock("../../../../prisma/seed/allocation", () => ({
  buildUsersByRole: mockFns.buildUsersByRole,
  seedAdminTeamAllocation: vi.fn(),
  seedAssessmentStudentModuleCoverage: vi.fn(),
  seedGithubE2EUsers: vi.fn(),
  seedModuleTeachingAssistants: vi.fn(),
  seedModuleLeads: vi.fn(),
  seedStudentEnrollments: vi.fn(),
  seedTeamAllocations: vi.fn(),
}));

import { buildSeedContext } from "../../../../prisma/seed/plan";

describe("buildSeedContext", () => {
  it("assembles seed context from core and catalog seeders", async () => {
    const enterprise = { id: "ent-1", code: "DEFAULT", name: "Default" };
    const context = await buildSeedContext(enterprise, "hash");

    expect(mockFns.seedAdminUser).toHaveBeenCalledWith("ent-1");
    expect(mockFns.seedUsers).toHaveBeenCalledWith("ent-1", "hash");
    expect(mockFns.seedQuestionnaireTemplates).toHaveBeenCalledWith(1);
    expect(context.enterprise.id).toBe("ent-1");
    expect(context.usersByRole.adminOrStaff).toHaveLength(1);
    expect(context.standardUsers.map((user) => user.id)).toEqual([1, 2]);
    expect(context.assessmentAccounts.map((user) => user.id)).toEqual([3]);
    expect(mockFns.buildUsersByRole).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 1 }), expect.objectContaining({ id: 2 })]),
    );
    expect(context.projects).toEqual([{ id: 1000, moduleId: 10, templateId: 100 }]);
    expect(context.teams).toEqual([{ id: 2000, projectId: 1000 }]);
  });
});
