import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./service.drafts.js";

describe("service.drafts", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["listAllocationDraftsForProject","updateAllocationDraftForProject","approveAllocationDraftForProject","deleteAllocationDraftForProject"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});