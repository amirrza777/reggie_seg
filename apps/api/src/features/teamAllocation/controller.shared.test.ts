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
    [undefined, null],
    ["", null],
    ["2", 2],
    ["2.5", "invalid"],
  ])("parses optional positive integer %p", (input, expected) => {
    expect(parseOptionalPositiveInteger(input)).toBe(expected);
  });

  it("normalizes manual allocation search query", () => {
    expect(parseManualAllocationSearchQuery("  abc  ")).toBe("abc");
    expect(parseManualAllocationSearchQuery("  ")).toBeNull();
    expect(parseManualAllocationSearchQuery({})).toBe("invalid");
    expect(parseManualAllocationSearchQuery("x".repeat(121))).toBe("invalid");
  });

  it("formats stale student names with remainder suffix", () => {
    const stale = [
      { firstName: "Sam", lastName: "Ng" },
      { email: "jin@example.com" },
      { firstName: "A", lastName: "B" },
      { firstName: "C", lastName: "D" },
      { firstName: "E", lastName: "F" },
      { firstName: "G", lastName: "H" },
    ];
    expect(formatCustomAllocationStaleStudentNames(stale)).toBe("Sam Ng, jin@example.com, A B, C D, E F (+1 more)");
  });

  it("maps validation codes to 400 responses", () => {
    const res = createResponse();
    respondCustomAllocationValidationError(res, "INVALID_CRITERIA");
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Each criterion must include a valid questionId, strategy, and weight between 1 and 5",
    });
  });
});