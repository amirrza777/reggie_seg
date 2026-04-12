import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteCustomAllocationPreview,
  findStaleStudentsFromPreview,
  getCustomAllocationResponseThreshold,
  getStoredCustomAllocationPreview,
  normalizeCustomAllocationQuestionType,
  parseCustomAllocationAnswers,
  resolveCustomAllocationTeamNames,
  storeCustomAllocationPreview,
  type StoredCustomAllocationPreview,
} from "./service.custom-allocation.shared.js";

function buildPreview(previewId: string, overrides: Partial<StoredCustomAllocationPreview> = {}) {
  const generatedAt = new Date();
  return {
    previewId,
    staffId: 7,
    projectId: 9,
    questionnaireTemplateId: 3,
    generatedAt,
    expiresAt: new Date(generatedAt.getTime() + 60_000),
    teamCount: 2,
    nonRespondentStrategy: "exclude" as const,
    criteriaSummary: [],
    teamCriteriaSummary: [],
    overallScore: 0.8,
    previewTeams: [],
    ...overrides,
  } satisfies StoredCustomAllocationPreview;
}

function expectThrownCode(run: () => unknown, code: string) {
  try {
    run();
  } catch (error: any) {
    expect(error).toEqual({ code });
    return;
  }
  throw new Error("expected throw");
}

describe("service.custom-allocation.shared", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.useRealTimers();
    process.env = { ...env };
    delete process.env.CUSTOM_ALLOCATION_RESPONSE_THRESHOLD;
  });

  afterEach(() => {
    process.env = { ...env };
    vi.useRealTimers();
  });

  it.each([
    ["multiple-choice", "multiple-choice"],
    ["MULTIPLE_CHOICE", "multiple-choice"],
    ["rating", "rating"],
    [" slider ", "slider"],
  ])("normalizes supported question type %p", (raw, expected) => {
    expect(normalizeCustomAllocationQuestionType(raw)).toBe(expected);
  });

  it("returns null for unsupported question types", () => {
    expect(normalizeCustomAllocationQuestionType("short-text")).toBeNull();
  });

  it("uses default response threshold when env value is missing or invalid", () => {
    expect(getCustomAllocationResponseThreshold()).toBe(80);
    process.env.CUSTOM_ALLOCATION_RESPONSE_THRESHOLD = "not-a-number";
    expect(getCustomAllocationResponseThreshold()).toBe(80);
  });

  it("clamps and rounds response threshold from env", () => {
    process.env.CUSTOM_ALLOCATION_RESPONSE_THRESHOLD = "122";
    expect(getCustomAllocationResponseThreshold()).toBe(100);
    process.env.CUSTOM_ALLOCATION_RESPONSE_THRESHOLD = "-2";
    expect(getCustomAllocationResponseThreshold()).toBe(0);
    process.env.CUSTOM_ALLOCATION_RESPONSE_THRESHOLD = "65.678";
    expect(getCustomAllocationResponseThreshold()).toBe(65.68);
  });

  it("stores and retrieves preview for matching staff and project", () => {
    const preview = buildPreview("p-shared-1");
    storeCustomAllocationPreview(preview);
    expect(getStoredCustomAllocationPreview("p-shared-1", 7, 9)).toEqual(preview);
    expect(getStoredCustomAllocationPreview("p-shared-1", 8, 9)).toBeNull();
    expect(getStoredCustomAllocationPreview("p-shared-1", 7, 10)).toBeNull();
    deleteCustomAllocationPreview("p-shared-1");
  });

  it("cleans expired previews during retrieval", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));
    storeCustomAllocationPreview(
      buildPreview("p-shared-expired", { expiresAt: new Date("2026-01-01T00:00:00.000Z") }),
    );
    expect(getStoredCustomAllocationPreview("p-shared-expired", 7, 9)).toBeNull();
  });

  it("cleans older expired previews when storing a new preview", () => {
    const now = Date.now();
    storeCustomAllocationPreview(
      buildPreview("p-shared-old", {
        generatedAt: new Date(now - 10 * 60_000),
        expiresAt: new Date(now - 5 * 60_000),
      }),
    );
    storeCustomAllocationPreview(
      buildPreview("p-shared-new", {
        generatedAt: new Date(now),
        expiresAt: new Date(now + 5 * 60_000),
      }),
    );
    expect(getStoredCustomAllocationPreview("p-shared-old", 7, 9)).toBeNull();
    expect(getStoredCustomAllocationPreview("p-shared-new", 7, 9)).not.toBeNull();
    deleteCustomAllocationPreview("p-shared-new");
  });

  it("parses answer arrays by question id and ignores invalid rows", () => {
    const parsed = parseCustomAllocationAnswers([
      { questionId: 1, answer: "A" },
      { question: "2", answer: 5 },
      { questionId: 3 },
      { questionId: "x", answer: "bad" },
      null,
    ]);
    expect(parsed.get(1)).toBe("A");
    expect(parsed.get(2)).toBe(5);
    expect(parsed.has(3)).toBe(false);
  });

  it("parses answer objects and ignores non-positive keys", () => {
    const parsed = parseCustomAllocationAnswers({ "1": "yes", "0": "no", x: 4 });
    expect(parsed.get(1)).toBe("yes");
    expect(parsed.has(0)).toBe(false);
    expect(parsed.has(Number("x"))).toBe(false);
  });

  it("returns an empty map for non-object non-array answer payloads", () => {
    expect(parseCustomAllocationAnswers(null).size).toBe(0);
    expect(parseCustomAllocationAnswers("nope").size).toBe(0);
  });

  it("returns default and provided team names", () => {
    const teams = [{ suggestedName: " Team A " }, { suggestedName: " " }];
    expect(resolveCustomAllocationTeamNames(teams)).toEqual(["Team A", "Custom Team 2"]);
    expect(resolveCustomAllocationTeamNames(teams, [" A ", "B "])).toEqual(["A", "B"]);
  });

  it("rejects invalid or duplicate team names", () => {
    const teams = [{ suggestedName: "A" }, { suggestedName: "B" }];
    expectThrownCode(() => resolveCustomAllocationTeamNames(teams, ["A"] as any), "INVALID_TEAM_NAMES");
    expectThrownCode(() => resolveCustomAllocationTeamNames(teams, ["A", "  "]), "INVALID_TEAM_NAMES");
    expectThrownCode(() => resolveCustomAllocationTeamNames(teams, ["A", "a"]), "DUPLICATE_TEAM_NAMES");
  });

  it("returns stale students once and skips still-vacant students", () => {
    const stale = findStaleStudentsFromPreview(
      [
        {
          index: 0,
          suggestedName: "A",
          members: [
            { id: 1, firstName: "A", lastName: "One", email: "a@x", responseStatus: "RESPONDED" },
            { id: 2, firstName: "B", lastName: "Two", email: "b@x", responseStatus: "NO_RESPONSE" },
          ],
        },
        {
          index: 1,
          suggestedName: "B",
          members: [{ id: 1, firstName: "A", lastName: "One", email: "a@x", responseStatus: "RESPONDED" }],
        },
      ],
      new Set([2]),
    );
    expect(stale).toEqual([{ id: 1, firstName: "A", lastName: "One", email: "a@x" }]);
  });

  it("deletes stored preview by id", () => {
    storeCustomAllocationPreview(buildPreview("p-shared-delete"));
    deleteCustomAllocationPreview("p-shared-delete");
    expect(getStoredCustomAllocationPreview("p-shared-delete", 7, 9)).toBeNull();
  });
});
