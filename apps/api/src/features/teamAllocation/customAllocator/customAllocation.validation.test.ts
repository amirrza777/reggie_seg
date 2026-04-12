import { describe, expect, it } from "vitest";
import {
  parseCustomAllocationApplyBody,
  parseCustomAllocationCoverageTemplateId,
  parseCustomAllocationPreviewBody,
  parseCustomAllocationProjectId,
} from "./customAllocation.validation.js";

describe("customAllocation validation", () => {
  it("parses and rejects project ids", () => {
    expect(parseCustomAllocationProjectId("abc")).toEqual({ ok: false, code: "INVALID_PROJECT_ID" });
    expect(parseCustomAllocationProjectId("12")).toEqual({ ok: true, value: 12 });
  });

  it("parses and rejects coverage template ids", () => {
    expect(parseCustomAllocationCoverageTemplateId("0")).toEqual({ ok: false, code: "INVALID_TEMPLATE_ID" });
    expect(parseCustomAllocationCoverageTemplateId("3")).toEqual({ ok: true, value: 3 });
  });

  it.each([
    [{ questionnaireTemplateId: 0 }, "INVALID_TEMPLATE_ID"],
    [{ questionnaireTemplateId: 2, teamCount: 0 }, "INVALID_TEAM_COUNT"],
    [{ questionnaireTemplateId: 2, teamCount: 2, minTeamSize: 0 }, "INVALID_MIN_TEAM_SIZE"],
    [{ questionnaireTemplateId: 2, teamCount: 2, maxTeamSize: 0 }, "INVALID_MAX_TEAM_SIZE"],
    [{ questionnaireTemplateId: 2, teamCount: 2, minTeamSize: 3, maxTeamSize: 2 }, "INVALID_TEAM_SIZE_RANGE"],
    [{ questionnaireTemplateId: 2, teamCount: 2, nonRespondentStrategy: "bad" }, "INVALID_NON_RESPONDENT_STRATEGY"],
    [{ questionnaireTemplateId: 2, teamCount: 2, nonRespondentStrategy: "exclude", criteria: {} }, "INVALID_CRITERIA"],
  ])("rejects invalid preview payload", (body, code) => {
    expect(parseCustomAllocationPreviewBody(body)).toEqual({ ok: false, code });
  });

  it("rejects invalid preview criteria rows", () => {
    const base = { questionnaireTemplateId: 2, teamCount: 2, nonRespondentStrategy: "exclude" };
    const badStrategy = { ...base, criteria: [{ questionId: 7, strategy: "bad", weight: 3 }] };
    const badWeight = { ...base, criteria: [{ questionId: 7, strategy: "group", weight: 8 }] };
    expect(parseCustomAllocationPreviewBody(badStrategy)).toEqual({ ok: false, code: "INVALID_CRITERIA" });
    expect(parseCustomAllocationPreviewBody(badWeight)).toEqual({ ok: false, code: "INVALID_CRITERIA" });
  });

  it("parses valid preview payload including optional constraints", () => {
    const parsed = parseCustomAllocationPreviewBody({
      questionnaireTemplateId: 2,
      teamCount: 3,
      minTeamSize: "1",
      maxTeamSize: "3",
      nonRespondentStrategy: "exclude",
      criteria: [{ questionId: 7, strategy: "group", weight: 4 }],
    });
    expect(parsed).toEqual({
      ok: true,
      value: {
        questionnaireTemplateId: 2,
        teamCount: 3,
        minTeamSize: 1,
        maxTeamSize: 3,
        nonRespondentStrategy: "exclude",
        criteria: [{ questionId: 7, strategy: "group", weight: 4 }],
      },
    });
  });

  it("rejects invalid apply payload preview id and team names", () => {
    expect(parseCustomAllocationApplyBody({ previewId: " " })).toEqual({
      ok: false,
      code: "INVALID_PREVIEW_ID",
    });
    expect(parseCustomAllocationApplyBody({ previewId: "p", teamNames: ["A", 2] })).toEqual({
      ok: false,
      code: "INVALID_TEAM_NAMES",
    });
    expect(parseCustomAllocationApplyBody({ previewId: 123 as any })).toEqual({
      ok: false,
      code: "INVALID_PREVIEW_ID",
    });
  });

  it("parses apply payload without team names", () => {
    expect(parseCustomAllocationApplyBody({ previewId: " p-1 " })).toEqual({
      ok: true,
      value: { previewId: "p-1" },
    });
  });

  it("parses and trims apply team names", () => {
    const parsed = parseCustomAllocationApplyBody({ previewId: "p", teamNames: [" Team A ", "Team B"] });
    expect(parsed).toEqual({ ok: true, value: { previewId: "p", teamNames: ["Team A", "Team B"] } });
  });
});
