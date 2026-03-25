import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./controller.shared.js";

describe("controller.shared", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["respondCustomAllocationValidationError","parseOptionalPositiveInteger","parseManualAllocationSearchQuery","formatCustomAllocationStaleStudentNames"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});