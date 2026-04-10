import { describe, expect, it } from "vitest";
import {
  applyCustomAllocationForProject,
  getCustomAllocationCoverageForProject,
  previewCustomAllocationForProject,
} from "./service.js";

describe("service custom-allocation", () => {
  it("rejects invalid template id for coverage", async () => {
    await expect(getCustomAllocationCoverageForProject(1, 2, 0)).rejects.toEqual({ code: "INVALID_TEMPLATE_ID" });
  });

  it("rejects invalid preview payload", async () => {
    await expect(
      previewCustomAllocationForProject(1, 2, {
        questionnaireTemplateId: 3,
        teamCount: 2,
        nonRespondentStrategy: "bad" as any,
        criteria: [],
      }),
    ).rejects.toEqual({ code: "INVALID_NON_RESPONDENT_STRATEGY" });
  });

  it("rejects invalid preview criteria", async () => {
    await expect(
      previewCustomAllocationForProject(1, 2, {
        questionnaireTemplateId: 3,
        teamCount: 2,
        nonRespondentStrategy: "exclude",
        criteria: [{ questionId: 1, strategy: "diversify", weight: 9 }],
      } as any),
    ).rejects.toEqual({ code: "INVALID_CRITERIA" });
  });

  it("rejects empty preview id when applying", async () => {
    await expect(applyCustomAllocationForProject(1, 2, { previewId: "   " })).rejects.toEqual({
      code: "INVALID_PREVIEW_ID",
    });
  });
});