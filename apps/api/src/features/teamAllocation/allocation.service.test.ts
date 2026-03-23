import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./allocation.service.js";

describe("allocation.service", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["getManualAllocationWorkspaceForProject","applyManualAllocationForProject","previewRandomAllocationForProject","applyRandomAllocationForProject"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});