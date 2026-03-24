import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./service.shared.js";

describe("service.shared", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["normalizeTeamSizeConstraints","buildConstrainedRandomPlan","buildConstrainedCustomPopulation"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});