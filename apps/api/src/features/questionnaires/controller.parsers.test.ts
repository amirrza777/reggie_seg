import { describe, expect, it } from "vitest";
import {
  parseCreateOrUpdateTemplateBody,
  parseOptionalQuestionnairePurposeQuery,
  parseQuestionnaireTemplateId,
} from "./controller.parsers.js";

describe("questionnaires controller parsers", () => {
  it("parses questionnaire template id", () => {
    expect(parseQuestionnaireTemplateId("5")).toEqual({ ok: true, value: 5 });
    expect(parseQuestionnaireTemplateId("x")).toEqual({ ok: false, error: "Invalid questionnaire template ID" });
    expect(parseQuestionnaireTemplateId("x", "Custom error")).toEqual({ ok: false, error: "Custom error" });
  });

  it("parses create/update body with optional public flag and purpose", () => {
    expect(parseCreateOrUpdateTemplateBody({ templateName: " A ", questions: [], isPublic: false })).toEqual({
      ok: true,
      value: { templateName: "A", questions: [], isPublic: false },
    });
    expect(
      parseCreateOrUpdateTemplateBody({
        templateName: " B ",
        questions: [{ label: "Q", type: "rating" }],
        purpose: "CUSTOMISED_ALLOCATION",
        isPublic: true,
      }),
    ).toEqual({
      ok: true,
      value: {
        templateName: "B",
        questions: [{ label: "Q", type: "rating" }],
        isPublic: true,
        purpose: "CUSTOMISED_ALLOCATION",
      },
    });
  });

  it("rejects invalid create/update body", () => {
    expect(parseCreateOrUpdateTemplateBody(null)).toEqual({ ok: false, error: "Invalid request body" });
    expect(parseCreateOrUpdateTemplateBody({ templateName: "", questions: [] })).toEqual({
      ok: false,
      error: "Invalid request body",
    });
    expect(parseCreateOrUpdateTemplateBody({ templateName: "X", questions: "nope" })).toEqual({
      ok: false,
      error: "Invalid request body",
    });
    expect(parseCreateOrUpdateTemplateBody({ templateName: "X", questions: [], isPublic: "true" })).toEqual({
      ok: false,
      error: "Invalid request body",
    });
    expect(parseCreateOrUpdateTemplateBody({ templateName: "X", questions: [], purpose: "WRONG" })).toEqual({
      ok: false,
      error: "Invalid request body",
    });
  });

  it("parses optional purpose query", () => {
    expect(parseOptionalQuestionnairePurposeQuery(undefined)).toEqual({ ok: true, value: undefined });
    expect(parseOptionalQuestionnairePurposeQuery("")).toEqual({ ok: true, value: undefined });
    expect(parseOptionalQuestionnairePurposeQuery("GENERAL_PURPOSE")).toEqual({
      ok: true,
      value: "GENERAL_PURPOSE",
    });
    expect(parseOptionalQuestionnairePurposeQuery("INVALID")).toEqual({
      ok: false,
      error: "purpose must be PEER_ASSESSMENT, CUSTOMISED_ALLOCATION, or GENERAL_PURPOSE",
    });
  });
});
