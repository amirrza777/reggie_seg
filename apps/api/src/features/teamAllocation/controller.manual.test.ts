import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./controller.manual.js";

describe("controller.manual", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["getManualAllocationWorkspaceHandler","applyManualAllocationHandler"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});