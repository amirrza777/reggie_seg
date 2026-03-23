import { describe, expect, it } from "vitest";
import { getCustomAllocationCoverageForProject } from "./service.custom-allocation.catalog.js";

describe("service.custom-allocation.catalog", () => {
  it.each([0, -1, 2.5])("rejects invalid template id %p", async (templateId) => {
    await expect(getCustomAllocationCoverageForProject(1, 2, templateId)).rejects.toMatchObject({
      code: "INVALID_TEMPLATE_ID",
    });
  });
});