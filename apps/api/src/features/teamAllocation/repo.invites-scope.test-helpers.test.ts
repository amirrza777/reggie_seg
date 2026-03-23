import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./repo.invites-scope.test-helpers.js";

describe("repo.invites-scope.test-helpers", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["setupTeamAllocationRepoTestDefaults","prisma"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});