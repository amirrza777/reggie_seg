import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./repo.drafts.reads.js";

describe("repo.drafts.reads", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["findProjectDraftTeams","findDraftTeamInProject","findDraftTeamById","findTeamNameConflictInEnterprise","findModuleStudentsByIdsInModule","findStudentAllocationConflictsInProject"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});