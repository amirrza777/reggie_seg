import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./repo.drafts.writes.js";

describe("repo.drafts.writes", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["updateDraftTeam","deleteDraftTeam","approveDraftTeam"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});