import { describe, expect, it } from "vitest";
import {
  parseCustomAllocationApplyBody,
  parseCustomAllocationCoverageTemplateId,
  parseCustomAllocationPreviewBody,
  parseCustomAllocationProjectId,
} from "./customAllocation.validation.js";

describe("customAllocation.validation", () => {
  describe("parseCustomAllocationProjectId", () => {
    it("parses numeric project ids", () => {
      expect(parseCustomAllocationProjectId("42")).toEqual({ ok: true, value: 42 });
    });

    it("rejects non-numeric project ids", () => {
      expect(parseCustomAllocationProjectId("abc")).toEqual({
        ok: false,
        code: "INVALID_PROJECT_ID",
      });
    });
  });

  describe("parseCustomAllocationCoverageTemplateId", () => {
    it("parses positive integer template ids", () => {
      expect(parseCustomAllocationCoverageTemplateId("7")).toEqual({ ok: true, value: 7 });
    });

    it("rejects non-positive template ids", () => {
      expect(parseCustomAllocationCoverageTemplateId("0")).toEqual({
        ok: false,
        code: "INVALID_TEMPLATE_ID",
      });
    });
  });

  describe("parseCustomAllocationPreviewBody", () => {
    it("parses a valid preview payload", () => {
      const result = parseCustomAllocationPreviewBody({
        questionnaireTemplateId: 5,
        teamCount: 3,
        seed: "123",
        nonRespondentStrategy: "distribute_randomly",
        criteria: [
          { questionId: 11, strategy: "diversify", weight: 5 },
          { questionId: 12, strategy: "group", weight: 2 },
          { questionId: 13, strategy: "ignore", weight: 1 },
        ],
      });

      expect(result).toEqual({
        ok: true,
        value: {
          questionnaireTemplateId: 5,
          teamCount: 3,
          seed: 123,
          nonRespondentStrategy: "distribute_randomly",
          criteria: [
            { questionId: 11, strategy: "diversify", weight: 5 },
            { questionId: 12, strategy: "group", weight: 2 },
            { questionId: 13, strategy: "ignore", weight: 1 },
          ],
        },
      });
    });

    it("allows preview payloads without seed", () => {
      const result = parseCustomAllocationPreviewBody({
        questionnaireTemplateId: 5,
        teamCount: 3,
        nonRespondentStrategy: "exclude",
        criteria: [],
      });

      expect(result).toEqual({
        ok: true,
        value: {
          questionnaireTemplateId: 5,
          teamCount: 3,
          nonRespondentStrategy: "exclude",
          criteria: [],
        },
      });
    });

    it("rejects invalid seed", () => {
      expect(
        parseCustomAllocationPreviewBody({
          questionnaireTemplateId: 5,
          teamCount: 3,
          seed: "abc",
          nonRespondentStrategy: "exclude",
          criteria: [],
        }),
      ).toEqual({
        ok: false,
        code: "INVALID_SEED",
      });
    });

    it("rejects invalid non-respondent strategy", () => {
      expect(
        parseCustomAllocationPreviewBody({
          questionnaireTemplateId: 5,
          teamCount: 3,
          nonRespondentStrategy: "random",
          criteria: [],
        }),
      ).toEqual({
        ok: false,
        code: "INVALID_NON_RESPONDENT_STRATEGY",
      });
    });

    it("rejects invalid criteria payloads", () => {
      expect(
        parseCustomAllocationPreviewBody({
          questionnaireTemplateId: 5,
          teamCount: 3,
          nonRespondentStrategy: "exclude",
          criteria: [{ questionId: 11, strategy: "diversify", weight: 0 }],
        }),
      ).toEqual({
        ok: false,
        code: "INVALID_CRITERIA",
      });
    });
  });

  describe("parseCustomAllocationApplyBody", () => {
    it("parses preview-only apply payload", () => {
      expect(parseCustomAllocationApplyBody({ previewId: "p-1" })).toEqual({
        ok: true,
        value: {
          previewId: "p-1",
        },
      });
    });

    it("parses and trims team names", () => {
      expect(parseCustomAllocationApplyBody({ previewId: "p-1", teamNames: [" Team A ", "Team B"] })).toEqual({
        ok: true,
        value: {
          previewId: "p-1",
          teamNames: ["Team A", "Team B"],
        },
      });
    });

    it("rejects empty preview id", () => {
      expect(parseCustomAllocationApplyBody({ previewId: " " })).toEqual({
        ok: false,
        code: "INVALID_PREVIEW_ID",
      });
    });

    it("rejects invalid team names payload", () => {
      expect(parseCustomAllocationApplyBody({ previewId: "p-1", teamNames: [1, "Team B"] })).toEqual({
        ok: false,
        code: "INVALID_TEAM_NAMES",
      });
    });
  });
});