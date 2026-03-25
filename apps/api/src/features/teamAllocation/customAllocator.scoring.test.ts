import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./customAllocator.scoring.js";

describe("customAllocator.scoring", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["buildCriterionRuntime","scoreCriterion","buildTeamCriterionBreakdowns","evaluateOverallScore","pickDistinctTeamPair"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});