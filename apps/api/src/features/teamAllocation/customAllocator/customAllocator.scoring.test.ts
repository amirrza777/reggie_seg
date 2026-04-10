import { describe, expect, it } from "vitest";
import {
  buildCriterionRuntime,
  buildTeamCriterionBreakdowns,
  evaluateOverallScore,
  pickDistinctTeamPair,
  scoreCriterion,
} from "./customAllocator.scoring.js";

const respondents = [
  { id: 1, responses: { 101: 1, 202: "A" } },
  { id: 2, responses: { 101: 3, 202: "A" } },
  { id: 3, responses: { 101: 5, 202: "B" } },
] as const;

describe("customAllocator.scoring", () => {
  it("builds numeric and categorical criterion runtimes", () => {
    const numeric = buildCriterionRuntime([...respondents], { questionId: 101, strategy: "diversify", weight: 2 });
    const categorical = buildCriterionRuntime([...respondents], { questionId: 202, strategy: "group", weight: 1 });
    expect(numeric.kind).toBe("numeric");
    expect(categorical.kind).toBe("categorical");
    expect(categorical.categoricalGlobalCounts.get("A")).toBe(2);
  });

  it("scores criteria and computes weighted overall score", () => {
    const numeric = buildCriterionRuntime([...respondents], { questionId: 101, strategy: "diversify", weight: 2 });
    const categorical = buildCriterionRuntime([...respondents], { questionId: 202, strategy: "group", weight: 1 });
    const teams = [[0, 2], [1]];
    expect(scoreCriterion(numeric, teams)).toBeGreaterThanOrEqual(0);
    const score = evaluateOverallScore([numeric, categorical], teams);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("builds team breakdown summaries and handles empty teams", () => {
    const criterion = buildCriterionRuntime([...respondents], { questionId: 202, strategy: "group", weight: 1 });
    const breakdown = buildTeamCriterionBreakdowns([criterion], [[0, 1], []]);
    expect(breakdown[0]?.criteria[0]?.summary.kind).toBe("categorical");
    expect(breakdown[1]?.criteria[0]?.summary.kind).toBe("none");
  });

  it("picks distinct non-empty team indexes", () => {
    const values = [0.9, 0.1];
    let index = 0;
    const rng = () => {
      const value = values[index] ?? 0.1;
      index += 1;
      return value;
    };
    const pair = pickDistinctTeamPair([[1], [], [2]], rng);
    expect(pair).toEqual([2, 0]);
    expect(pickDistinctTeamPair([[], [1], []], () => 0.2)).toBeNull();
  });
});