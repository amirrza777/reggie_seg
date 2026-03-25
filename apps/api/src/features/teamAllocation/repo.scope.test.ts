import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./repo.scope.js";

describe("repo.scope", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["findStaffScopedProject","findStaffScopedProjectAccess","findVacantModuleStudentsForProject","findModuleStudentsForManualAllocation","findProjectTeamSummaries"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});