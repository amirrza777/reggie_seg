import { describe, expect, it, vi } from "vitest";
import {
  formatCustomAllocationStaleStudentNames,
  parseManualAllocationSearchQuery,
  parseOptionalPositiveInteger,
  respondCustomAllocationValidationError,
} from "./controller.shared.js";

function createResponse() {
  const res = { status: vi.fn(), json: vi.fn() } as any;
  res.status.mockReturnValue(res);
  return res;
}

describe("controller.shared", () => {
  it.each([
    ["INVALID_PROJECT_ID", "Invalid project ID"],
    ["INVALID_TEMPLATE_ID", "questionnaireTemplateId must be a positive integer"],
    ["INVALID_TEAM_COUNT", "teamCount must be a positive integer"],
    ["INVALID_MIN_TEAM_SIZE", "minTeamSize must be a positive integer when provided"],
    ["INVALID_MAX_TEAM_SIZE", "maxTeamSize must be a positive integer when provided"],
    ["INVALID_TEAM_SIZE_RANGE", "minTeamSize cannot be greater than maxTeamSize"],
    ["INVALID_NON_RESPONDENT_STRATEGY", "nonRespondentStrategy must be either 'distribute_randomly' or 'exclude'"],
    ["INVALID_CRITERIA", "Each criterion must include a valid questionId, strategy, and weight between 1 and 5"],
    ["INVALID_PREVIEW_ID", "previewId is required"],
    ["INVALID_TEAM_NAMES", "teamNames must be an array of strings when provided"],
  ])("maps %s to 400 response", (code, message) => {
    const res = createResponse();
    respondCustomAllocationValidationError(res, code as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: message });
  });

  it.each([
    [undefined, null],
    [null, null],
    ["", null],
    ["2", 2],
    [2, 2],
    ["0", "invalid"],
    ["2.5", "invalid"],
    ["x", "invalid"],
  ])("parses optional positive integer %p", (input, expected) => {
    expect(parseOptionalPositiveInteger(input)).toBe(expected);
  });

  it.each([
    [undefined, null],
    [null, null],
    ["", null],
    ["   ", null],
    [{}, "invalid"],
    ["x".repeat(121), "invalid"],
    ["  abc  ", "abc"],
  ])("normalizes manual allocation search query %p", (input, expected) => {
    expect(parseManualAllocationSearchQuery(input)).toBe(expected);
  });

  it("returns null when stale student list is empty or unusable", () => {
    expect(formatCustomAllocationStaleStudentNames(null)).toBeNull();
    expect(formatCustomAllocationStaleStudentNames([])).toBeNull();
    expect(formatCustomAllocationStaleStudentNames([null, { id: 1 }])).toBeNull();
  });

  it("formats stale student names and adds overflow suffix", () => {
    const stale = [
      { firstName: "Sam", lastName: "Ng" },
      { email: "jin@example.com" },
      { firstName: "A", lastName: "B" },
      { firstName: "C", lastName: "D" },
      { firstName: "E", lastName: "F" },
      { firstName: "G", lastName: "H" },
    ];
    expect(formatCustomAllocationStaleStudentNames(stale)).toBe(
      "Sam Ng, jin@example.com, A B, C D, E F (+1 more)",
    );
  });
});