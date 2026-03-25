import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./controller.drafts.js";

describe("controller.drafts", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["listAllocationDraftsHandler","updateAllocationDraftHandler","approveAllocationDraftHandler","deleteAllocationDraftHandler"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});