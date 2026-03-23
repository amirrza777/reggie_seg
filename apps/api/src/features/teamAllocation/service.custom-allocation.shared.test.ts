import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./service.custom-allocation.shared.js";

describe("service.custom-allocation.shared", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["normalizeCustomAllocationQuestionType","getCustomAllocationResponseThreshold","storeCustomAllocationPreview","getStoredCustomAllocationPreview","parseCustomAllocationAnswers","resolveCustomAllocationTeamNames","findStaleStudentsFromPreview","deleteCustomAllocationPreview","CUSTOM_ALLOCATION_PREVIEW_TTL_MS"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});