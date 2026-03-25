import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./team.service.js";

describe("team.service", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["createTeam","createTeamForProject","getTeamById","addUserToTeam","getTeamMembers"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});