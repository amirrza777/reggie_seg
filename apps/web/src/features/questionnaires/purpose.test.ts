import { describe, expect, it } from "vitest";
import { DEFAULT_QUESTIONNAIRE_PURPOSE, normalizeQuestionnairePurpose, QUESTIONNAIRE_PURPOSE_OPTIONS } from "./purpose";

describe("normalizeQuestionnairePurpose", () => {
  it("returns default for non-strings", () => {
    expect(normalizeQuestionnairePurpose(null)).toBe(DEFAULT_QUESTIONNAIRE_PURPOSE);
    expect(normalizeQuestionnairePurpose(1)).toBe(DEFAULT_QUESTIONNAIRE_PURPOSE);
  });

  it("normalizes known purposes with trimming and case", () => {
    expect(normalizeQuestionnairePurpose("  customised_allocation  ")).toBe("CUSTOMISED_ALLOCATION");
    expect(normalizeQuestionnairePurpose("peer_assessment")).toBe("PEER_ASSESSMENT");
    expect(normalizeQuestionnairePurpose("general_purpose")).toBe("GENERAL_PURPOSE");
  });

  it("returns default for unknown strings", () => {
    expect(normalizeQuestionnairePurpose("OTHER")).toBe(DEFAULT_QUESTIONNAIRE_PURPOSE);
  });
});

describe("QUESTIONNAIRE_PURPOSE_OPTIONS", () => {
  it("includes a label for each purpose", () => {
    expect(QUESTIONNAIRE_PURPOSE_OPTIONS.length).toBeGreaterThan(0);
    expect(QUESTIONNAIRE_PURPOSE_OPTIONS.every((o) => o.label.length > 0)).toBe(true);
  });
});
