export type AllocationStrategy = "diversify" | "group";
export type NonRespondentStrategy = "distribute_randomly" | "exclude";

export const EPSILON = 1e-9;

export type CustomAllocationCriterion = {
  questionId: number;
  strategy: AllocationStrategy;
  weight: number;
};

export type CustomAllocationRespondent<TStudent extends { id: number }> = TStudent & {
  responses: Record<number, unknown>;
};

export type CustomAllocationTeamMember<TStudent extends { id: number }> = TStudent & {
  responseStatus: "RESPONDED" | "NO_RESPONSE";
};

export type CustomAllocationPlan<TStudent extends { id: number }> = {
  teams: Array<{
    index: number;
    members: CustomAllocationTeamMember<TStudent>[];
  }>;
  unassignedNonRespondents: TStudent[];
  criterionScores: Array<{
    questionId: number;
    strategy: AllocationStrategy;
    weight: number;
    satisfactionScore: number;
  }>;
  teamCriterionBreakdowns: Array<{
    teamIndex: number;
    criteria: Array<{
      questionId: number;
      strategy: AllocationStrategy;
      weight: number;
      responseCount: number;
      summary:
        | {
            kind: "none";
          }
        | {
            kind: "numeric";
            average: number;
            min: number;
            max: number;
          }
        | {
            kind: "categorical";
            categories: Array<{
              value: string;
              count: number;
            }>;
          };
    }>;
  }>;
  overallScore: number;
};

export type CustomAllocationPlannerInput<TStudent extends { id: number }> = {
  respondents: Array<CustomAllocationRespondent<TStudent>>;
  nonRespondents: TStudent[];
  criteria: CustomAllocationCriterion[];
  teamCount: number;
  nonRespondentStrategy: NonRespondentStrategy;
  seed?: number;
  iterations?: number;
  minTeamSize?: number;
  maxTeamSize?: number;
};

export type CriterionRuntime = {
  questionId: number;
  strategy: AllocationStrategy;
  weight: number;
  kind: "numeric" | "categorical";
  values: Array<number | string | null>;
  validCount: number;
  numericGlobalMean: number;
  numericGlobalVariance: number;
  numericGlobalStd: number;
  categoricalGlobalCounts: Map<string, number>;
};