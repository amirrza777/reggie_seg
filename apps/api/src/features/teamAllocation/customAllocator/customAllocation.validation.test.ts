import { describe, expect, it } from "vitest";
import {
  parseCustomAllocationApplyBody,
  parseCustomAllocationCoverageTemplateId,
  parseCustomAllocationPreviewBody,
  parseCustomAllocationProjectId,
} from "./customAllocation.validation.js";

describe("customAllocation validation", () => {
  it.each([
    [parseCustomAllocationProjectId, "abc", "INVALID_PROJECT_ID"],
    [parseCustomAllocationCoverageTemplateId, "0", "INVALID_TEMPLATE_ID"],
  ])("returns %s for invalid input", (parser: any, input: unknown, code: string) => {
    expect(parser(input)).toEqual({ ok: false, code });
  });

  it("parses valid preview input", () => {
    const parsed = parseCustomAllocationPreviewBody({
      questionnaireTemplateId: 2,
      teamCount: 3,
      nonRespondentStrategy: "exclude",
      criteria: [{ questionId: 7, strategy: "group", weight: 4 }],
    });
    expect(parsed.ok).toBe(true);
    expect(parsed).toMatchObject({ value: { teamCount: 3 } });
  });

  it("rejects invalid preview criteria", () => {
    const parsed = parseCustomAllocationPreviewBody({
      questionnaireTemplateId: 2,
      teamCount: 3,
      nonRespondentStrategy: "exclude",
      criteria: [{ questionId: 7, strategy: "group", weight: 8 }],
    });
    expect(parsed).toEqual({ ok: false, code: "INVALID_CRITERIA" });
  });

  it("parses and trims apply team names", () => {
    const parsed = parseCustomAllocationApplyBody({ previewId: "p", teamNames: [" Team A ", "Team B"] });
    expect(parsed).toEqual({ ok: true, value: { previewId: "p", teamNames: ["Team A", "Team B"] } });
  });
});