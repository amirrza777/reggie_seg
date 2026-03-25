import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./customAllocator.validation.js";

describe("customAllocator.validation", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["resolveTeamSizeTargets","distributeCountAcrossTeamCapacities","assignIndexesToTeamTargets"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});