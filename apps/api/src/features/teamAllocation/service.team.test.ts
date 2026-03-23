import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./service.team.js";

describe("service.team", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["createTeam","createTeamForProject","getTeamById","addUserToTeam","getTeamMembers"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});