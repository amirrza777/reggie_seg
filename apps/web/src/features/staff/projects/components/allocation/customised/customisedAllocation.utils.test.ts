import { describe, expect, it } from "vitest";
import {
  countEligibleQuestions,
  formatTeamCriterionSummary,
  getCurrentPreviewInputSnapshot,
  getInputValidationError,
  getQualityLabel,
  getTeamName,
  getTeamNameValidationError,
  getTeamNamesForApply,
  isCurrentInputMatchingPreview,
  isSupportedCriteriaQuestion,
  parseOptionalPositiveIntegerInput,
  sortByTemplateName,
  toDefaultTeamNameMap,
  toFullName,
  toPreviewInputKey,
  type CustomAllocationCriteriaInput,
} from "./customisedAllocation.utils";

const templates = [
  {
    id: 2,
    templateName: "Zeta",
    ownerId: 1,
    isPublic: false,
    eligibleQuestionCount: 2,
    eligibleQuestions: [{ id: 1, label: "A", type: "text" }, { id: 2, label: "B", type: "rating" }],
  },
  {
    id: 1,
    templateName: "Alpha",
    ownerId: 1,
    isPublic: true,
    eligibleQuestionCount: 1,
    eligibleQuestions: [{ id: 3, label: "C", type: "multiple-choice" }],
  },
];

const preview = {
  previewTeams: [
    { index: 0, suggestedName: "Team A" },
    { index: 1, suggestedName: "Team B" },
  ],
} as const;

const criteria: CustomAllocationCriteriaInput[] = [{ questionId: 3, strategy: "diversify", weight: 2 }];

describe("customisedAllocation.utils", () => {
  it("sorts templates and identifies supported criteria", () => {
    expect(sortByTemplateName(templates).map((item) => item.templateName)).toEqual(["Alpha", "Zeta"]);
    expect(isSupportedCriteriaQuestion(templates[0].eligibleQuestions[0] as never)).toBe(false);
    expect(isSupportedCriteriaQuestion(templates[0].eligibleQuestions[1] as never)).toBe(true);
    expect(countEligibleQuestions(templates[0] as never)).toBe(1);
    expect(countEligibleQuestions(templates[1] as never)).toBe(1);
  });

  it("formats names and quality labels", () => {
    expect(toFullName({ firstName: "Jin", lastName: "Lee", email: "jin@example.com" })).toBe("Jin Lee");
    expect(toFullName({ firstName: "", lastName: "", email: "anon@example.com" })).toBe("anon@example.com");
    expect(getQualityLabel(0.8)).toBe("Good");
    expect(getQualityLabel(0.5)).toBe("Fair");
    expect(getQualityLabel(0.49)).toBe("Poor");
  });

  it("parses optional positive integers", () => {
    expect(parseOptionalPositiveIntegerInput("   ")).toBeUndefined();
    expect(parseOptionalPositiveIntegerInput("2")).toBe(2);
    expect(parseOptionalPositiveIntegerInput("0")).toBeNull();
    expect(parseOptionalPositiveIntegerInput("-1")).toBeNull();
    expect(parseOptionalPositiveIntegerInput("2.5")).toBeNull();
  });

  it("formats criterion summaries for all summary kinds", () => {
    const none = { responseCount: 0, summary: { kind: "none" } };
    const numeric = { responseCount: 1, summary: { kind: "numeric", average: 4, min: 2, max: 5 } };
    const categorical = { responseCount: 2, summary: { kind: "categorical", categories: [{ value: "Async", count: 2 }] } };
    expect(formatTeamCriterionSummary(none as never)).toBe("No responses (0)");
    expect(formatTeamCriterionSummary(numeric as never)).toBe("avg 4 (min 2, max 5)");
    expect(formatTeamCriterionSummary(categorical as never)).toBe("Async: 2");
  });

  it("validates preview input fields", () => {
    const selectedQuestionnaire = templates[0] as never;
    expect(getInputValidationError({ selectedQuestionnaire: null, teamCountInput: "2", minTeamSizeInput: "", maxTeamSizeInput: "" })).toBe("Select a questionnaire first.");
    expect(getInputValidationError({ selectedQuestionnaire, teamCountInput: "0", minTeamSizeInput: "", maxTeamSizeInput: "" })).toBe("Team count must be a positive integer.");
    expect(getInputValidationError({ selectedQuestionnaire, teamCountInput: "2", minTeamSizeInput: "x", maxTeamSizeInput: "" })).toBe("Minimum students per team must be a positive integer when provided.");
    expect(getInputValidationError({ selectedQuestionnaire, teamCountInput: "2", minTeamSizeInput: "1", maxTeamSizeInput: "x" })).toBe("Maximum students per team must be a positive integer when provided.");
    expect(getInputValidationError({ selectedQuestionnaire, teamCountInput: "2", minTeamSizeInput: "5", maxTeamSizeInput: "2" })).toBe("Minimum students per team cannot be greater than maximum students per team.");
    expect(getInputValidationError({ selectedQuestionnaire, teamCountInput: "2", minTeamSizeInput: "", maxTeamSizeInput: "" })).toBeNull();
  });

  it("builds snapshots and preview keys only for valid inputs", () => {
    const selectedQuestionnaire = templates[1] as never;
    const invalid = getCurrentPreviewInputSnapshot({ selectedQuestionnaire, teamCountInput: "2", minTeamSizeInput: "x", maxTeamSizeInput: "", nonRespondentStrategy: "exclude", criteriaPayload: criteria });
    const valid = getCurrentPreviewInputSnapshot({ selectedQuestionnaire, teamCountInput: "2", minTeamSizeInput: "1", maxTeamSizeInput: "3", nonRespondentStrategy: "distribute_randomly", criteriaPayload: criteria });
    expect(invalid).toBeNull();
    expect(valid).toMatchObject({ questionnaireTemplateId: 1, teamCount: 2, minTeamSize: 1, maxTeamSize: 3 });
    expect(toPreviewInputKey(valid as never)).toContain('"questionnaireTemplateId":1');
    expect(toDefaultTeamNameMap(preview as never)).toEqual({ 0: "Team A", 1: "Team B" });
  });

  it("matches preview inputs against key snapshots", () => {
    const snapshot = getCurrentPreviewInputSnapshot({ selectedQuestionnaire: templates[1] as never, teamCountInput: "2", minTeamSizeInput: "", maxTeamSizeInput: "", nonRespondentStrategy: "exclude", criteriaPayload: criteria });
    const key = toPreviewInputKey(snapshot as never);
    expect(isCurrentInputMatchingPreview({ preview: null, previewInputKey: key, currentSnapshot: snapshot })).toBe(false);
    expect(isCurrentInputMatchingPreview({ preview: preview as never, previewInputKey: null, currentSnapshot: snapshot })).toBe(false);
    expect(isCurrentInputMatchingPreview({ preview: preview as never, previewInputKey: key, currentSnapshot: null })).toBe(false);
    expect(isCurrentInputMatchingPreview({ preview: preview as never, previewInputKey: key, currentSnapshot: snapshot })).toBe(true);
  });

  it("validates and builds final team names", () => {
    expect(getTeamName({ 0: "Custom" }, 0, "Fallback")).toBe("Custom");
    expect(getTeamName({}, 1, "Fallback")).toBe("Fallback");
    expect(getTeamNameValidationError(null, {})).toBe("Generate a preview before confirming.");
    expect(getTeamNameValidationError(preview as never, { 0: "", 1: "Team B" })).toBe("Team names cannot be empty.");
    expect(getTeamNameValidationError(preview as never, { 0: "Team", 1: "team" })).toBe("Team names must be unique.");
    expect(getTeamNameValidationError(preview as never, { 0: "One", 1: "Two" })).toBeNull();
    expect(getTeamNamesForApply(null, {})).toEqual([]);
    expect(getTeamNamesForApply(preview as never, { 0: " One ", 1: " Two " })).toEqual(["One", "Two"]);
  });
});