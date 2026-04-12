import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  helpers: {
    createSeededRng: vi.fn(),
    shuffle: vi.fn(),
    stripResponses: vi.fn(),
  },
  scoring: {
    buildCriterionRuntime: vi.fn(),
    buildTeamCriterionBreakdowns: vi.fn(),
    evaluateOverallScore: vi.fn(),
    pickDistinctTeamPair: vi.fn(),
    scoreCriterion: vi.fn(),
  },
  validation: {
    assignIndexesToTeamTargets: vi.fn(),
    distributeCountAcrossTeamCapacities: vi.fn(),
    resolveTeamSizeTargets: vi.fn(),
  },
}));

vi.mock("./customAllocator.helpers.js", () => ({
  createSeededRng: mocks.helpers.createSeededRng,
  shuffle: mocks.helpers.shuffle,
  stripResponses: mocks.helpers.stripResponses,
}));

vi.mock("./customAllocator.scoring.js", () => ({
  buildCriterionRuntime: mocks.scoring.buildCriterionRuntime,
  buildTeamCriterionBreakdowns: mocks.scoring.buildTeamCriterionBreakdowns,
  evaluateOverallScore: mocks.scoring.evaluateOverallScore,
  pickDistinctTeamPair: mocks.scoring.pickDistinctTeamPair,
  scoreCriterion: mocks.scoring.scoreCriterion,
}));

vi.mock("./customAllocator.validation.js", () => ({
  assignIndexesToTeamTargets: mocks.validation.assignIndexesToTeamTargets,
  distributeCountAcrossTeamCapacities: mocks.validation.distributeCountAcrossTeamCapacities,
  resolveTeamSizeTargets: mocks.validation.resolveTeamSizeTargets,
}));

import { planCustomAllocationTeams } from "./customAllocator.js";

describe("customAllocator edge branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.helpers.createSeededRng.mockReturnValue(() => 0.5);
    mocks.helpers.stripResponses.mockImplementation((student: any) => student);
    mocks.scoring.evaluateOverallScore.mockReturnValue(0);
    mocks.scoring.buildCriterionRuntime.mockReturnValue([]);
    mocks.scoring.buildTeamCriterionBreakdowns.mockReturnValue([]);
    mocks.scoring.scoreCriterion.mockReturnValue(0);
    mocks.scoring.pickDistinctTeamPair.mockReturnValue(null);
  });

  it("throws when non-respondent capacity total mismatches student count", () => {
    mocks.validation.resolveTeamSizeTargets.mockReturnValue([0, 0]);
    mocks.validation.distributeCountAcrossTeamCapacities.mockReturnValue([0, 0]);
    mocks.validation.assignIndexesToTeamTargets.mockReturnValue([[], []]);
    mocks.helpers.shuffle.mockImplementation((items: any[]) => items);
    expect(() =>
      planCustomAllocationTeams({
        respondents: [],
        nonRespondents: [{ id: 1 }, { id: 2 }],
        criteria: [],
        teamCount: 2,
        nonRespondentStrategy: "distribute_randomly",
      }),
    ).toThrow("team size constraints cannot be satisfied for non-respondent distribution");
  });

  it("breaks annealing early when no distinct non-empty team pair is available", () => {
    mocks.validation.resolveTeamSizeTargets.mockReturnValue([1, 1]);
    mocks.validation.distributeCountAcrossTeamCapacities.mockReturnValue([1, 1]);
    mocks.validation.assignIndexesToTeamTargets.mockReturnValue([[0], [1]]);
    mocks.helpers.shuffle.mockImplementation((items: any[]) => items);
    mocks.scoring.buildCriterionRuntime.mockReturnValue({
      questionId: 1,
      strategy: "group",
      weight: 1,
      kind: "numeric",
      values: [1, 2],
      validCount: 2,
      numericGlobalMean: 1.5,
      numericGlobalVariance: 0.25,
      numericGlobalStd: 0.5,
      categoricalGlobalCounts: new Map(),
    });
    const result = planCustomAllocationTeams({
      respondents: [{ id: 1, responses: { 1: 1 } }, { id: 2, responses: { 1: 2 } }],
      nonRespondents: [],
      criteria: [{ questionId: 1, strategy: "group", weight: 1 }],
      teamCount: 2,
      nonRespondentStrategy: "exclude",
      iterations: 3,
    });
    expect(result.teams).toHaveLength(2);
    expect(mocks.scoring.pickDistinctTeamPair).toHaveBeenCalled();
  });

  it("throws when respondent assignment already overfills constrained capacities", () => {
    mocks.validation.resolveTeamSizeTargets.mockReturnValue([0, 1]);
    mocks.validation.distributeCountAcrossTeamCapacities.mockReturnValue([1, 1]);
    mocks.validation.assignIndexesToTeamTargets.mockReturnValue([[0], [1]]);
    mocks.helpers.shuffle.mockImplementation((items: any[]) => items);
    expect(() =>
      planCustomAllocationTeams({
        respondents: [{ id: 1, responses: {} }, { id: 2, responses: {} }],
        nonRespondents: [{ id: 3 }],
        criteria: [],
        teamCount: 2,
        nonRespondentStrategy: "distribute_randomly",
      }),
    ).toThrow("team size targets are overfilled");
  });

  it("throws when all team targets are full during non-respondent assignment", () => {
    const iterableButShortLength = {
      length: 1,
      [Symbol.iterator]: function* () {
        yield { id: 1 };
        yield { id: 2 };
      },
    } as any;
    mocks.validation.resolveTeamSizeTargets.mockReturnValue([1, 0]);
    mocks.validation.distributeCountAcrossTeamCapacities.mockReturnValue([0, 0]);
    mocks.validation.assignIndexesToTeamTargets.mockReturnValue([[], []]);
    mocks.helpers.shuffle.mockImplementationOnce(() => []).mockImplementationOnce(() => iterableButShortLength);
    expect(() =>
      planCustomAllocationTeams({
        respondents: [],
        nonRespondents: [{ id: 1 }, { id: 2 }],
        criteria: [],
        teamCount: 2,
        nonRespondentStrategy: "distribute_randomly",
      }),
    ).toThrow("team size targets are overfilled");
  });
});
