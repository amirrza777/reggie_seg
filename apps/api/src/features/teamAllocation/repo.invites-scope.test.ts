import { describe, expect, it } from "vitest";
import * as scopeRepo from "./repo.scope.js";
import { prisma, setupTeamAllocationRepoTestDefaults } from "./repo.invites-scope.test-helpers.js";

describe("repo invites scope", () => {
  it("resets helper mocks", () => {
    prisma.team.findUnique();
    expect(prisma.team.findUnique).toHaveBeenCalledTimes(1);
    setupTeamAllocationRepoTestDefaults();
    expect(prisma.team.findUnique).toHaveBeenCalledTimes(0);
  });

  it.each([
    "findStaffScopedProject",
    "findStaffScopedProjectAccess",
    "findVacantModuleStudentsForProject",
    "findProjectTeamSummaries",
  ])("exports %s from scope repo", (name) => {
    expect(scopeRepo).toHaveProperty(name);
  });
});