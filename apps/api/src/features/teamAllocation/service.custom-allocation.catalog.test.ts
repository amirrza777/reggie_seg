import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./service.custom-allocation.catalog.js";

describe("service.custom-allocation.catalog", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["listCustomAllocationQuestionnairesForProject","getCustomAllocationCoverageForProject"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});