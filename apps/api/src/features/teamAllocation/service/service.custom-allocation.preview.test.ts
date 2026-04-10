import { describe, expect, it } from "vitest";
import { previewCustomAllocationForProject } from "./service.custom-allocation.preview.js";

describe("service.custom-allocation.preview", () => {
  it("rejects invalid teamCount", async () => {
    await expect(
      previewCustomAllocationForProject(1, 2, {
        questionnaireTemplateId: 5,
        teamCount: 0,
        nonRespondentStrategy: "exclude",
        criteria: [],
      }),
    ).rejects.toMatchObject({ code: "INVALID_TEAM_COUNT" });
  });

  it("rejects invalid nonRespondentStrategy", async () => {
    await expect(
      previewCustomAllocationForProject(1, 2, {
        questionnaireTemplateId: 5,
        teamCount: 2,
        nonRespondentStrategy: "invalid" as any,
        criteria: [],
      }),
    ).rejects.toMatchObject({ code: "INVALID_NON_RESPONDENT_STRATEGY" });
  });

  it("rejects malformed criteria records", async () => {
    await expect(
      previewCustomAllocationForProject(1, 2, {
        questionnaireTemplateId: 5,
        teamCount: 2,
        nonRespondentStrategy: "exclude",
        criteria: [{ questionId: 7, strategy: "group", weight: 7 }] as any,
      }),
    ).rejects.toMatchObject({ code: "INVALID_CRITERIA" });
  });
});