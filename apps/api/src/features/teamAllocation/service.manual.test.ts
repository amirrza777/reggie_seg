import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./service.manual.js";

describe("service.manual", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["getManualAllocationWorkspaceForProject","applyManualAllocationForProject"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});