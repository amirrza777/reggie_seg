import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./allocation.controller.js";

describe("allocation.controller", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["previewRandomAllocationHandler","getManualAllocationWorkspaceHandler","applyRandomAllocationHandler","applyManualAllocationHandler"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});