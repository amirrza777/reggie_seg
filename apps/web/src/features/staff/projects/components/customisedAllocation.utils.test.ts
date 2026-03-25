import { describe, expect, it } from "vitest";
import {
  countEligibleQuestions,
  formatTeamCriterionSummary,
  getInputValidationError,
  getTeamNameValidationError,
  getTeamNamesForApply,
  sortByTemplateName,
  toDefaultTeamNameMap,
  toPreviewInputKey,
} from "./customisedAllocation.utils";

const templates = [
  {
    id: 2,
    templateName: "Zeta",
    ownerId: 1,
    isPublic: false,
    eligibleQuestionCount: 2,
    eligibleQuestions: [{ id: 1, label: "A", type: "text" as const }, { id: 2, label: "B", type: "rating" as const }],
  },
  {
    id: 1,
    templateName: "Alpha",
    ownerId: 1,
    isPublic: true,
    eligibleQuestionCount: 1,
    eligibleQuestions: [{ id: 3, label: "C", type: "multiple-choice" as const }],
  },
];

const preview = {
  previewTeams: [
    { index: 0, suggestedName: "Team A" },
    { index: 1, suggestedName: "Team B" },
  ],
} as any;

describe("customisedAllocation.utils", () => {
  it("sorts templates and counts only supported criteria questions", () => {
    expect(sortByTemplateName(templates).map((item) => item.templateName)).toEqual(["Alpha", "Zeta"]);
    expect(countEligibleQuestions(templates[0] as any)).toBe(1);
    expect(countEligibleQuestions(templates[1] as any)).toBe(1);
  });

  it("validates input ranges and team count", () => {
    const selectedQuestionnaire = templates[0] as any;
    expect(getInputValidationError({ selectedQuestionnaire, teamCountInput: "0", minTeamSizeInput: "", maxTeamSizeInput: "" })).toBe(
      "Team count must be a positive integer.",
    );
    expect(getInputValidationError({ selectedQuestionnaire, teamCountInput: "2", minTeamSizeInput: "5", maxTeamSizeInput: "2" })).toBe(
      "Minimum students per team cannot be greater than maximum students per team.",
    );
  });

  it("builds stable preview keys and default team names", () => {
    const key = toPreviewInputKey({
      questionnaireTemplateId: 1,
      teamCount: 2,
      nonRespondentStrategy: "distribute_randomly",
      criteria: [{ questionId: 3, strategy: "diversify", weight: 2 }],
    });
    expect(key).toContain('"teamCount":2');
    expect(toDefaultTeamNameMap(preview)).toEqual({ 0: "Team A", 1: "Team B" });
  });

  it("formats criterion summaries and validates final team names", () => {
    const numeric = { responseCount: 1, summary: { kind: "numeric", average: 4, min: 2, max: 5 } } as any;
    const categorical = { responseCount: 1, summary: { kind: "categorical", categories: [{ value: "Async", count: 1 }] } } as any;
    expect(formatTeamCriterionSummary(numeric)).toBe("avg 4 (min 2, max 5)");
    expect(formatTeamCriterionSummary(categorical)).toBe("Async: 1");
    expect(getTeamNameValidationError(preview, { 0: "", 1: "Team B" })).toBe("Team names cannot be empty.");
    expect(getTeamNamesForApply(preview, { 0: "One", 1: "Two" })).toEqual(["One", "Two"]);
  });
});