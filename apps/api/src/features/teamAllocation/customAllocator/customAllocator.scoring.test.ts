import { describe, expect, it } from "vitest";
import {
  buildCriterionRuntime,
  buildTeamCriterionBreakdowns,
  evaluateOverallScore,
  pickDistinctTeamPair,
  scoreCriterion,
} from "./customAllocator.scoring.js";

describe("customAllocator.scoring", () => {
  it("builds numeric runtime with global stats", () => {
    const runtime = buildCriterionRuntime(
      [{ id: 1, responses: { 10: 1 } }, { id: 2, responses: { 10: 3 } }],
      { questionId: 10, strategy: "diversify", weight: 2 },
    );
    expect(runtime.kind).toBe("numeric");
    expect(runtime.validCount).toBe(2);
    expect(runtime.numericGlobalMean).toBe(2);
  });

  it("builds categorical runtime with value counts", () => {
    const runtime = buildCriterionRuntime(
      [{ id: 1, responses: { 20: "A" } }, { id: 2, responses: { 20: "B" } }, { id: 3, responses: { 20: "A" } }],
      { questionId: 20, strategy: "group", weight: 1 },
    );
    expect(runtime.kind).toBe("categorical");
    expect(runtime.categoricalGlobalCounts.get("A")).toBe(2);
    expect(runtime.categoricalGlobalCounts.get("B")).toBe(1);
  });

  it("scores diversify criteria across numeric and categorical modes", () => {
    const numeric = buildCriterionRuntime(
      [{ id: 1, responses: { 10: 1 } }, { id: 2, responses: { 10: 3 } }, { id: 3, responses: { 10: 5 } }],
      { questionId: 10, strategy: "diversify", weight: 1 },
    );
    const categorical = buildCriterionRuntime(
      [{ id: 1, responses: { 20: "A" } }, { id: 2, responses: { 20: "A" } }, { id: 3, responses: { 20: "B" } }],
      { questionId: 20, strategy: "diversify", weight: 1 },
    );
    expect(scoreCriterion(numeric, [[0, 2], [1]])).toBeGreaterThan(0);
    expect(scoreCriterion(categorical, [[0, 1], [2]])).toBeGreaterThan(0);
  });

  it("returns 1 for diversify score when criterion has no valid values", () => {
    const numericEmpty = {
      questionId: 10,
      strategy: "diversify",
      weight: 1,
      kind: "numeric",
      values: [null],
      validCount: 0,
      numericGlobalMean: 0,
      numericGlobalVariance: 0,
      numericGlobalStd: 0,
      categoricalGlobalCounts: new Map<string, number>(),
    } as any;
    const categoricalEmpty = { ...numericEmpty, kind: "categorical", values: [null] };
    expect(scoreCriterion(numericEmpty, [[0]])).toBe(1);
    expect(scoreCriterion(categoricalEmpty, [[0]])).toBe(1);
  });

  it("scores group criteria across numeric and categorical modes", () => {
    const numeric = buildCriterionRuntime(
      [{ id: 1, responses: { 30: 1 } }, { id: 2, responses: { 30: 2 } }, { id: 3, responses: { 30: 9 } }],
      { questionId: 30, strategy: "group", weight: 2 },
    );
    const categorical = buildCriterionRuntime(
      [{ id: 1, responses: { 40: "X" } }, { id: 2, responses: { 40: "X" } }, { id: 3, responses: { 40: "Y" } }],
      { questionId: 40, strategy: "group", weight: 1 },
    );
    expect(scoreCriterion(numeric, [[0, 1], [2]])).toBeGreaterThan(0);
    expect(scoreCriterion(categorical, [[0, 1], [2]])).toBeGreaterThan(0);
  });

  it("returns 1 for group score when numeric variance is flat or team has no valid values", () => {
    const flatNumeric = {
      questionId: 30,
      strategy: "group",
      weight: 1,
      kind: "numeric",
      values: [4, 4],
      validCount: 2,
      numericGlobalMean: 4,
      numericGlobalVariance: 0,
      numericGlobalStd: 0,
      categoricalGlobalCounts: new Map<string, number>(),
    } as any;
    const emptyCategorical = { ...flatNumeric, kind: "categorical", values: [1, 2], validCount: 2 } as any;
    const noValidCategorical = { ...flatNumeric, kind: "categorical", values: [], validCount: 0 } as any;
    const noNumericValues = {
      ...flatNumeric,
      numericGlobalVariance: 2,
      values: [null, null],
      validCount: 2,
    } as any;
    expect(scoreCriterion(flatNumeric, [[0], [1]])).toBe(1);
    expect(scoreCriterion(emptyCategorical, [[0], [1]])).toBe(1);
    expect(scoreCriterion(noValidCategorical, [[0], [1]])).toBe(1);
    expect(scoreCriterion(noNumericValues, [[0], [1]])).toBe(1);
  });

  it("builds team criterion breakdowns for none, numeric, and categorical summaries", () => {
    const numeric = {
      questionId: 1,
      strategy: "group",
      weight: 1,
      kind: "numeric",
      values: [2, null, 4],
    } as any;
    const categorical = {
      questionId: 2,
      strategy: "diversify",
      weight: 1,
      kind: "categorical",
      values: ["b", "a", "a"],
    } as any;
    const breakdown = buildTeamCriterionBreakdowns([numeric, categorical], [[0, 1, 2], [1], []]);
    expect(breakdown[0]?.criteria[0]?.summary.kind).toBe("numeric");
    expect(breakdown[0]?.criteria[1]?.summary.kind).toBe("categorical");
    expect((breakdown[0]?.criteria[1] as any).summary.categories[0]).toEqual({ value: "a", count: 2 });
    expect(breakdown[1]?.criteria[0]?.summary.kind).toBe("none");
  });

  it("sorts categorical summary ties alphabetically", () => {
    const criterion = {
      questionId: 7,
      strategy: "group",
      weight: 1,
      kind: "categorical",
      values: ["b", "a"],
    } as any;
    const breakdown = buildTeamCriterionBreakdowns([criterion], [[0, 1]]);
    expect((breakdown[0]?.criteria[0] as any).summary.categories).toEqual([
      { value: "a", count: 1 },
      { value: "b", count: 1 },
    ]);
  });

  it("evaluates overall weighted score and handles empty/zero-weight criteria", () => {
    const criterion = {
      questionId: 5,
      strategy: "diversify",
      weight: 2,
      kind: "numeric",
      values: [1, 3],
      validCount: 2,
      numericGlobalMean: 2,
      numericGlobalVariance: 1,
      numericGlobalStd: 1,
      categoricalGlobalCounts: new Map<string, number>(),
    } as any;
    expect(evaluateOverallScore([], [[0]])).toBe(0);
    expect(evaluateOverallScore([{ ...criterion, weight: 0 }], [[0, 1]])).toBe(0);
    expect(evaluateOverallScore([criterion], [[0, 1]])).toBeGreaterThanOrEqual(0);
  });

  it("selects distinct team pairs and returns null when fewer than two teams are non-empty", () => {
    const values = [0.9, 0.9, 0.2];
    let index = 0;
    const rng = () => values[index++] ?? 0.2;
    expect(pickDistinctTeamPair([[1], [], [2]], rng)).toEqual([2, 0]);
    expect(pickDistinctTeamPair([[], [1], []], () => 0.1)).toBeNull();
  });
});