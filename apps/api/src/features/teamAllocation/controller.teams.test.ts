import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./controller.teams.js";

describe("controller.teams", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["createTeamHandler","createTeamForProjectHandler","getTeamByIdHandler","addUserToTeamHandler","getTeamMembersHandler"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});