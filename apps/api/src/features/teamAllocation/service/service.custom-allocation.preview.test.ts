import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  randomUUID: vi.fn(),
  assertProjectMutableForWrites: vi.fn(),
  planCustomAllocationTeams: vi.fn(),
  repo: {
    findCustomAllocationTemplateForStaff: vi.fn(),
    findLatestCustomAllocationResponsesForStudents: vi.fn(),
    findStaffScopedProject: vi.fn(),
    findVacantModuleStudentsForProject: vi.fn(),
  },
  shared: {
    normalizeCustomAllocationQuestionType: vi.fn(),
    parseCustomAllocationAnswers: vi.fn(),
    storeCustomAllocationPreview: vi.fn(),
  },
  serviceShared: {
    buildConstrainedCustomPopulation: vi.fn(),
    normalizeTeamSizeConstraints: vi.fn(),
  },
}));

vi.mock("crypto", () => ({
  default: {
    randomUUID: mocks.randomUUID,
  },
}));

vi.mock("../../../shared/projectWriteGuard.js", () => ({
  assertProjectMutableForWrites: mocks.assertProjectMutableForWrites,
}));

vi.mock("../customAllocator/customAllocator.js", () => ({
  planCustomAllocationTeams: mocks.planCustomAllocationTeams,
}));

vi.mock("../repo/repo.js", () => ({
  findCustomAllocationTemplateForStaff: mocks.repo.findCustomAllocationTemplateForStaff,
  findLatestCustomAllocationResponsesForStudents: mocks.repo.findLatestCustomAllocationResponsesForStudents,
  findStaffScopedProject: mocks.repo.findStaffScopedProject,
  findVacantModuleStudentsForProject: mocks.repo.findVacantModuleStudentsForProject,
}));

vi.mock("./service.custom-allocation.shared.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./service.custom-allocation.shared.js")>();
  return {
    ...original,
    normalizeCustomAllocationQuestionType: mocks.shared.normalizeCustomAllocationQuestionType,
    parseCustomAllocationAnswers: mocks.shared.parseCustomAllocationAnswers,
    storeCustomAllocationPreview: mocks.shared.storeCustomAllocationPreview,
  };
});

vi.mock("./service.shared.js", () => ({
  buildConstrainedCustomPopulation: mocks.serviceShared.buildConstrainedCustomPopulation,
  normalizeTeamSizeConstraints: mocks.serviceShared.normalizeTeamSizeConstraints,
}));

import { previewCustomAllocationForProject } from "./service.custom-allocation.preview.js";

const baseProject = { id: 9, name: "Project", moduleId: 3, moduleName: "Module", enterpriseId: "ent-1" };
const baseStudents = [
  { id: 1, firstName: "A", lastName: "One", email: "a@x.com" },
  { id: 2, firstName: "B", lastName: "Two", email: "b@x.com" },
  { id: 3, firstName: "C", lastName: "Three", email: "c@x.com" },
];

function buildInput(overrides: Record<string, unknown> = {}) {
  return {
    questionnaireTemplateId: 5,
    teamCount: 3,
    nonRespondentStrategy: "exclude",
    criteria: [{ questionId: 10, strategy: "group", weight: 3 }],
    ...overrides,
  } as any;
}

function configureDefaultMocks() {
  mocks.randomUUID.mockReturnValue("uuid-1");
  mocks.repo.findStaffScopedProject.mockResolvedValue(baseProject);
  mocks.repo.findCustomAllocationTemplateForStaff.mockResolvedValue({
    id: 5,
    questions: [
      { id: 10, label: "Rating", type: "rating" },
      { id: 11, label: "Ignore", type: "text" },
    ],
  });
  mocks.repo.findVacantModuleStudentsForProject.mockResolvedValue(baseStudents);
  mocks.repo.findLatestCustomAllocationResponsesForStudents.mockResolvedValue([
    { reviewerUserId: 1, answersJson: { "10": 4 } },
    { reviewerUserId: 2, answersJson: { "10": 2 } },
  ]);
  mocks.shared.normalizeCustomAllocationQuestionType.mockImplementation((type: string) => {
    if (type === "rating") return "rating";
    return null;
  });
  mocks.shared.parseCustomAllocationAnswers.mockReturnValue(new Map([[10, 4]]));
  mocks.serviceShared.normalizeTeamSizeConstraints.mockReturnValue({});
  mocks.serviceShared.buildConstrainedCustomPopulation.mockReturnValue({
    activeTeamCount: 2,
    assignableRespondents: [
      { ...baseStudents[0], responses: { 10: 4 } },
      { ...baseStudents[1], responses: { 10: 2 } },
    ],
    unassignedRespondents: [],
    assignableNonRespondents: [{ ...baseStudents[2] }],
    unassignedNonRespondents: [{ ...baseStudents[2] }],
  });
  mocks.planCustomAllocationTeams.mockReturnValue({
    teams: [
      {
        index: 0,
        members: [
          { id: 1, firstName: "A", lastName: "One", email: "a@x.com", responseStatus: "RESPONDED" },
        ],
      },
    ],
    unassignedNonRespondents: [
      { id: 3, firstName: "C", lastName: "Three", email: "c@x.com" },
      { id: 4, firstName: "D", lastName: "Four", email: "d@x.com" },
    ],
    criterionScores: [{ questionId: 10, strategy: "group", weight: 3, satisfactionScore: 0.75 }],
    teamCriterionBreakdowns: [
      {
        teamIndex: 0,
        criteria: [
          {
            questionId: 10,
            strategy: "group",
            weight: 3,
            responseCount: 1,
            summary: { kind: "numeric", average: 4, min: 4, max: 4 },
          },
        ],
      },
    ],
    overallScore: 0.75,
  });
}

describe("service.custom-allocation.preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureDefaultMocks();
  });

  it.each([
    [buildInput({ teamCount: 0 }), "INVALID_TEAM_COUNT"],
    [buildInput({ questionnaireTemplateId: 0 }), "INVALID_TEMPLATE_ID"],
    [buildInput({ nonRespondentStrategy: "invalid" }), "INVALID_NON_RESPONDENT_STRATEGY"],
  ])("rejects invalid top-level preview input", async (input, code) => {
    await expect(previewCustomAllocationForProject(1, 9, input as any)).rejects.toEqual({ code });
  });

  it("rejects malformed criteria and invalid criterion question references", async () => {
    await expect(
      previewCustomAllocationForProject(1, 9, buildInput({ criteria: [{ questionId: 10, strategy: "group", weight: 7 }] })),
    ).rejects.toEqual({ code: "INVALID_CRITERIA" });
    await expect(
      previewCustomAllocationForProject(1, 9, buildInput({ criteria: [{ questionId: 99, strategy: "group", weight: 2 }] })),
    ).rejects.toEqual({ code: "INVALID_CRITERIA" });
  });

  it("rejects duplicate criteria question ids", async () => {
    const criteria = [
      { questionId: 10, strategy: "group", weight: 2 },
      { questionId: 10, strategy: "diversify", weight: 3 },
    ];
    await expect(previewCustomAllocationForProject(1, 9, buildInput({ criteria }))).rejects.toEqual({
      code: "INVALID_CRITERIA",
    });
  });

  it("accepts ignore criteria strategy and forwards team-size constraints to allocator", async () => {
    mocks.serviceShared.normalizeTeamSizeConstraints.mockReturnValueOnce({ minTeamSize: 1, maxTeamSize: 3 });
    await previewCustomAllocationForProject(
      7,
      9,
      buildInput({
        minTeamSize: 1,
        maxTeamSize: 3,
        criteria: [{ questionId: 10, strategy: "ignore", weight: 3 }],
      }),
    );
    expect(mocks.planCustomAllocationTeams).toHaveBeenCalledWith(
      expect.objectContaining({ minTeamSize: 1, maxTeamSize: 3, criteria: [] }),
    );
  });

  it("propagates team-size validation and project/template access errors", async () => {
    mocks.serviceShared.normalizeTeamSizeConstraints.mockImplementationOnce(() => {
      throw { code: "INVALID_MIN_TEAM_SIZE" };
    });
    await expect(previewCustomAllocationForProject(1, 9, buildInput())).rejects.toEqual({ code: "INVALID_MIN_TEAM_SIZE" });
    mocks.repo.findStaffScopedProject.mockResolvedValueOnce(null);
    await expect(previewCustomAllocationForProject(1, 9, buildInput())).rejects.toEqual({ code: "PROJECT_NOT_FOUND_OR_FORBIDDEN" });
    mocks.repo.findCustomAllocationTemplateForStaff.mockResolvedValueOnce(null);
    await expect(previewCustomAllocationForProject(1, 9, buildInput())).rejects.toEqual({
      code: "TEMPLATE_NOT_FOUND_OR_FORBIDDEN",
    });
  });

  it("rejects missing students and excessive team counts", async () => {
    mocks.repo.findVacantModuleStudentsForProject.mockResolvedValueOnce([]);
    await expect(previewCustomAllocationForProject(1, 9, buildInput())).rejects.toEqual({
      code: "NO_VACANT_STUDENTS",
    });
    mocks.repo.findVacantModuleStudentsForProject.mockResolvedValueOnce(baseStudents.slice(0, 1));
    await expect(previewCustomAllocationForProject(1, 9, buildInput({ teamCount: 2 }))).rejects.toEqual({
      code: "TEAM_COUNT_EXCEEDS_STUDENT_COUNT",
    });
  });

  it("returns preview payload with allocator scores when respondents are assignable", async () => {
    const result = await previewCustomAllocationForProject(7, 9, buildInput());
    expect(result.previewId).toBe("custom-preview-uuid-1");
    expect(result.teamCount).toBe(3);
    expect(result.previewTeams[0]?.members).toHaveLength(1);
    expect(result.previewTeams[1]?.members).toEqual([]);
    expect(result.criteriaSummary).toEqual([
      { questionId: 10, strategy: "group", weight: 3, satisfactionScore: 0.75 },
    ]);
    expect(result.unassignedStudents).toEqual([
      { id: 3, firstName: "C", lastName: "Three", email: "c@x.com", responseStatus: "NO_RESPONSE" },
      { id: 4, firstName: "D", lastName: "Four", email: "d@x.com", responseStatus: "NO_RESPONSE" },
    ]);
  });

  it("uses fallback summaries when no respondents are assignable", async () => {
    mocks.serviceShared.buildConstrainedCustomPopulation.mockReturnValueOnce({
      activeTeamCount: 0,
      assignableRespondents: [],
      unassignedRespondents: [{ ...baseStudents[0], responses: { 10: 4 } }],
      assignableNonRespondents: [],
      unassignedNonRespondents: [{ ...baseStudents[2] }],
    });
    const result = await previewCustomAllocationForProject(7, 9, buildInput({ nonRespondentStrategy: "distribute_randomly" }));
    expect(mocks.planCustomAllocationTeams).not.toHaveBeenCalled();
    expect(result.overallScore).toBe(0);
    expect(result.criteriaSummary).toEqual([
      { questionId: 10, strategy: "group", weight: 3, satisfactionScore: 0 },
    ]);
    expect(result.unassignedStudents).toHaveLength(2);
  });

  it("builds empty team criteria entries when active teams exist without assigned respondents", async () => {
    mocks.serviceShared.buildConstrainedCustomPopulation.mockReturnValueOnce({
      activeTeamCount: 2,
      assignableRespondents: [],
      unassignedRespondents: [],
      assignableNonRespondents: [],
      unassignedNonRespondents: [],
    });
    const result = await previewCustomAllocationForProject(7, 9, buildInput({ teamCount: 3 }));
    expect(result.teamCriteriaSummary[0]?.criteria[0]?.summary).toEqual({ kind: "none" });
    expect(result.teamCriteriaSummary[1]?.criteria[0]?.summary).toEqual({ kind: "none" });
    expect(result.teamCriteriaSummary[2]?.criteria[0]?.summary).toEqual({ kind: "none" });
  });

  it("falls back to an empty response map when parser returns undefined", async () => {
    mocks.shared.parseCustomAllocationAnswers.mockReturnValueOnce(undefined as any);
    const result = await previewCustomAllocationForProject(7, 9, buildInput());
    expect(result.previewId).toBe("custom-preview-uuid-1");
  });
});
