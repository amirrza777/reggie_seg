import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./teams.controller.js";

describe("teams.controller", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["createTeamHandler","createTeamForProjectHandler","getTeamByIdHandler","addUserToTeamHandler","getTeamMembersHandler"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});