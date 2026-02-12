import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getProgressForModulesILead,
  getModuleDetailsIfLead,
  getTeamDetailsIfLead,
  getStudentDetailsIfLead,
} from "./service.js";

vi.mock("./repo.js", () => ({
  findModulesForStaff: vi.fn(),
  countSubmittedPAsForModule: vi.fn(),
  countStudentsInModule: vi.fn(),
  getModuleDetailsIfAuthorised: vi.fn(),
  findTeamsInModule: vi.fn(),
  countSubmittedPAsForTeam: vi.fn(),
  countStudentsInTeam: vi.fn(),
  findTeamByIdAndModule: vi.fn(),
  getTeamWithAssessments: vi.fn(),
  findAssessmentsForRevieweeInTeam: vi.fn(),
  findTemplateWithQuestions: vi.fn(),
}));

import * as repo from "./repo.js";

const mockRepo = vi.mocked(repo);

beforeEach(() => {
  vi.clearAllMocks();
});

// --- Shared fixtures for student/team tests --- //

const moduleLead = { id: 1, name: "Module A" };
const teamInModule = { id: 10, teamName: "Team 1" };
const twoMembers = [
  { id: 100, firstName: "Alice", lastName: "Smith" },
  { id: 101, firstName: "Bob", lastName: "Jones" },
];

// --- Level 1: Modules list ---

describe("getProgressForModulesILead (level 1: modules list)", () => {
  it("returns team summaries for all modules that staff leads", async () => {
    mockRepo.findModulesForStaff.mockResolvedValue([
      { id: 1, name: "Module A" },
      { id: 2, name: "Module B" },
    ] as Awaited<ReturnType<typeof repo.findModulesForStaff>>);
    mockRepo.countSubmittedPAsForModule.mockResolvedValue(5);
    mockRepo.countStudentsInModule.mockResolvedValue(10);

    const result = await getProgressForModulesILead(1);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1, title: "Module A", submitted: 5, expected: 90 });
    expect(result[1]).toEqual({ id: 2, title: "Module B", submitted: 5, expected: 90 });
  });

  it.each([
    {
      scenario: "empty array when staff has no modules",
      modules: [] as { id: number; name: string }[],
      staffId: 99,
      expectLength: 0,
    },
    {
      scenario: "single module when staff leads one",
      modules: [{ id: 1, name: "Solo" }],
      staffId: 1,
      countSub: 0,
      countStud: 3,
      expectLength: 1,
      expectFirst: { id: 1, title: "Solo", submitted: 0, expected: 6 },
    },
  ])("$scenario", async (row) => {
    mockRepo.findModulesForStaff.mockResolvedValue(
      row.modules as Awaited<ReturnType<typeof repo.findModulesForStaff>>
    );
    if (row.modules.length > 0) {
      mockRepo.countSubmittedPAsForModule.mockResolvedValue(row.countSub!);
      mockRepo.countStudentsInModule.mockResolvedValue(row.countStud!);
    }
    const result = await getProgressForModulesILead(row.staffId);
    expect(result).toHaveLength(row.expectLength);
    if (row.expectFirst) expect(result[0]).toEqual(row.expectFirst);
  });

  it("uses per-module counts when modules differ in size", async () => {
    mockRepo.findModulesForStaff.mockResolvedValue([
      { id: 1, name: "Small" },
      { id: 2, name: "Large" },
    ] as Awaited<ReturnType<typeof repo.findModulesForStaff>>);
    mockRepo.countSubmittedPAsForModule
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(10);
    mockRepo.countStudentsInModule
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(5);

    const result = await getProgressForModulesILead(1);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1, title: "Small", submitted: 2, expected: 6 });
    expect(result[1]).toEqual({ id: 2, title: "Large", submitted: 10, expected: 20 });
  });
});

// --- Level 2: Module + teams --- //

describe("getModuleDetailsIfLead (level 2: module + teams)", () => {
  it("returns teams summary for a given module when staff is module lead", async () => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleLead);
    mockRepo.findTeamsInModule.mockResolvedValue([
      { id: 10, teamName: "Team 1" },
      { id: 11, teamName: "Team 2" },
    ] as Awaited<ReturnType<typeof repo.findTeamsInModule>>);
    mockRepo.countSubmittedPAsForTeam.mockResolvedValue(2);
    mockRepo.countStudentsInTeam.mockResolvedValue(4);

    const result = await getModuleDetailsIfLead(1, 1);

    expect(result).not.toBeNull();
    expect(result!.module).toEqual({ id: 1, title: "Module A" });
    expect(result!.teams).toHaveLength(2);
    expect(result!.teams[0]).toEqual({ id: 10, title: "Team 1", submitted: 2, expected: 12 });
  });

  it.each([
    {
      scenario: "returns null when staff is not module lead",
      module: null as { id: number; name: string } | null,
      teams: [] as { id: number; teamName: string }[],
      staffId: 99,
      moduleId: 1,
      expectNull: true,
    },
    {
      scenario: "returns module with empty teams when module has no teams",
      module: { id: 1, name: "Empty Module" },
      teams: [] as { id: number; teamName: string }[],
      staffId: 1,
      moduleId: 1,
      expectNull: false,
      expectModule: { id: 1, title: "Empty Module" },
      expectTeams: [] as { id: number; title: string; submitted: number; expected: number }[],
    },
  ])("$scenario", async (row) => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(row.module);
    mockRepo.findTeamsInModule.mockResolvedValue(
      row.teams as Awaited<ReturnType<typeof repo.findTeamsInModule>>
    );

    const result = await getModuleDetailsIfLead(row.staffId, row.moduleId);

    if (row.expectNull) {
      expect(result).toBeNull();
    } else {
      expect(result).not.toBeNull();
      if (row.expectModule) expect(result!.module).toEqual(row.expectModule);
      if (row.expectTeams) expect(result!.teams).toEqual(row.expectTeams);
    }
  });

  it("computes different expected per team by team size", async () => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleLead);
    mockRepo.findTeamsInModule.mockResolvedValue([
      { id: 10, teamName: "Small" },
      { id: 11, teamName: "Big" },
    ] as Awaited<ReturnType<typeof repo.findTeamsInModule>>);
    mockRepo.countSubmittedPAsForTeam.mockResolvedValueOnce(0).mockResolvedValueOnce(8);
    mockRepo.countStudentsInTeam.mockResolvedValueOnce(2).mockResolvedValueOnce(5);

    const result = await getModuleDetailsIfLead(1, 1);

    expect(result!.teams[0]).toMatchObject({
      id: 10,
      title: "Small",
      submitted: 0,
      expected: 2,
    });
    expect(result!.teams[1]).toMatchObject({
      id: 11,
      title: "Big",
      submitted: 8,
      expected: 20,
    });
  });
});

// --- Level 3: Team + students --- //

describe("getTeamDetailsIfLead (level 3: team + students)", () => {
  it("returns team-member summary for a given team when staff is module lead", async () => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleLead);
    mockRepo.findTeamByIdAndModule.mockResolvedValue(teamInModule);
    mockRepo.getTeamWithAssessments.mockResolvedValue({
      members: twoMembers,
      assessments: [
        { reviewerUserId: 100, revieweeUserId: 101 },
        { reviewerUserId: 101, revieweeUserId: 100 },
      ],
    });

    const result = await getTeamDetailsIfLead(1, 1, 10);

    expect(result).not.toBeNull();
    expect(result!.module).toEqual({ id: 1, title: "Module A" });
    expect(result!.team).toEqual({ id: 10, title: "Team 1" });
    expect(result!.students).toHaveLength(2);
    expect(result!.students[0]).toMatchObject({ id: 101, title: "Bob Jones", submitted: 1, expected: 1 });
    expect(result!.students[1]).toMatchObject({ id: 100, title: "Alice Smith", submitted: 1, expected: 1 });
  });

  it.each([
    { scenario: "staff is not module lead", module: null, team: null },
    { scenario: "team is not in module", module: moduleLead, team: null },
  ])("returns null when $scenario", async ({ module, team }) => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(module);
    mockRepo.findTeamByIdAndModule.mockResolvedValue(team);
    const result = module === null
      ? await getTeamDetailsIfLead(99, 1, 10)
      : await getTeamDetailsIfLead(1, 1, 999);
    expect(result).toBeNull();
  });

  it.each([
    {
      scenario: "empty students when team has no members",
      members: [] as { id: number; firstName: string; lastName: string }[],
      assessments: [] as { reviewerUserId: number; revieweeUserId: number }[],
      expectStudents: [],
    },
    {
      scenario: "Student {id} as title when member has no first/last name",
      members: [{ id: 100, firstName: "", lastName: "" }],
      assessments: [] as { reviewerUserId: number; revieweeUserId: number }[],
      expectStudents: [{ title: "Student 100", expected: 0 }],
    },
  ])("$scenario", async ({ members, assessments, expectStudents }) => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleLead);
    mockRepo.findTeamByIdAndModule.mockResolvedValue(teamInModule);
    mockRepo.getTeamWithAssessments.mockResolvedValue({ members, assessments });

    const result = await getTeamDetailsIfLead(1, 1, 10);

    expect(result!.students).toHaveLength(expectStudents.length || members.length);
    if (expectStudents.length === 0) expect(result!.students).toEqual([]);
    else {
      const expected = expectStudents[0];
      if (expected) expect(result!.students[0]).toMatchObject(expected);
    }
  });
});

// --- Level 4: Student details --- //

describe("getStudentDetailsIfLead (level 4: student details)", () => {
  it("returns full student performance summary when reviews exist", async () => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleLead);
    mockRepo.findTeamByIdAndModule.mockResolvedValue(teamInModule);
    mockRepo.getTeamWithAssessments.mockResolvedValue({
      members: twoMembers,
      assessments: [{ reviewerUserId: 101, revieweeUserId: 100 }],
    });
    mockRepo.findAssessmentsForRevieweeInTeam.mockResolvedValue([
      {
        id: 1,
        reviewerUserId: 101,
        answersJson: { 1: 4, 2: 5 },
        questionnaireTemplateId: 10,
        reviewer: { id: 101, firstName: "Bob", lastName: "Jones" },
      },
    ]);
    mockRepo.findTemplateWithQuestions.mockResolvedValue({
      id: 10,
      questions: [
        { id: 1, label: "Q1", order: 0 },
        { id: 2, label: "Q2", order: 1 },
      ],
    });

    const result = await getStudentDetailsIfLead(1, 1, 10, 100);

    expect(result).not.toBeNull();
    expect(result!.student).toEqual({ id: 100, firstName: "Alice", lastName: "Smith" });
    expect(result!.teamMembers).toHaveLength(1);
    expect(result!.teamMembers[0]).toEqual({
      id: 101,
      firstName: "Bob",
      lastName: "Jones",
      reviewedByCurrentStudent: false,
      reviewedCurrentStudent: true,
    });
    expect(result!.performanceSummary.overallAverage).toBe(4.5);
    expect(result!.performanceSummary.totalReviews).toBe(1);
    expect(result!.performanceSummary.questionAverages).toHaveLength(2);
  });

  it.each([
    { scenario: "staff is not module lead", module: null, team: null, studentId: 100 },
    { scenario: "team is not in module", module: moduleLead, team: null, studentId: 100 },
    { scenario: "student is not in team", module: moduleLead, team: teamInModule, studentId: 999 },
  ])("returns null when $scenario", async ({ module, team, studentId }) => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(module);
    mockRepo.findTeamByIdAndModule.mockResolvedValue(team);
    if (team) {
      mockRepo.getTeamWithAssessments.mockResolvedValue({ members: twoMembers, assessments: [] });
    }
    const result = module === null
      ? await getStudentDetailsIfLead(99, 1, 10, 100)
      : team === null
        ? await getStudentDetailsIfLead(1, 1, 999, 100)
        : await getStudentDetailsIfLead(1, 1, 10, studentId);
    expect(result).toBeNull();
  });

  it.each([
    {
      scenario: "no reviews: zeroed performance and correct teamMembers",
      reviews: [] as unknown[],
      template: undefined as { id: number; questions: { id: number; label: string; order: number }[] } | undefined,
      expectPerf: { overallAverage: 0, totalReviews: 0, questionAverages: [] },
      expectMember: { id: 101, firstName: "Bob", lastName: "Jones", reviewedByCurrentStudent: false, reviewedCurrentStudent: false },
    },
    {
      scenario: "template missing: zeroed performance summary",
      reviews: [
        {
          id: 1,
          reviewerUserId: 101,
          answersJson: {},
          questionnaireTemplateId: 10,
          reviewer: { id: 101, firstName: "Bob", lastName: "Jones" },
        },
      ],
      template: undefined as { id: number; questions: { id: number; label: string; order: number }[] } | undefined,
      expectPerf: { overallAverage: 0, totalReviews: 0, questionAverages: [] },
      expectMember: undefined,
    },
  ])("$scenario", async ({ reviews, template, expectPerf, expectMember }) => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleLead);
    mockRepo.findTeamByIdAndModule.mockResolvedValue(teamInModule);
    mockRepo.getTeamWithAssessments.mockResolvedValue({ members: twoMembers, assessments: [] });
    mockRepo.findAssessmentsForRevieweeInTeam.mockResolvedValue(
      reviews as Awaited<ReturnType<typeof repo.findAssessmentsForRevieweeInTeam>>
    );
    mockRepo.findTemplateWithQuestions.mockResolvedValue(template ?? null);

    const result = await getStudentDetailsIfLead(1, 1, 10, 100);

    expect(result!.performanceSummary).toEqual(expectPerf);
    if (expectMember) expect(result!.teamMembers[0]).toEqual(expectMember);
  });

  it("aggregates multiple reviewers and rounds averages correctly", async () => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleLead);
    mockRepo.findTeamByIdAndModule.mockResolvedValue(teamInModule);
    mockRepo.getTeamWithAssessments.mockResolvedValue({
      members: [
        ...twoMembers,
        { id: 102, firstName: "Carol", lastName: "Lee" },
      ],
      assessments: [],
    });
    mockRepo.findAssessmentsForRevieweeInTeam.mockResolvedValue([
      {
        id: 1,
        reviewerUserId: 101,
        answersJson: { 1: 3 },
        questionnaireTemplateId: 10,
        reviewer: { id: 101, firstName: "Bob", lastName: "Jones" },
      },
      {
        id: 2,
        reviewerUserId: 102,
        answersJson: { 1: 5 },
        questionnaireTemplateId: 10,
        reviewer: { id: 102, firstName: "Carol", lastName: "Lee" },
      },
    ]);
    mockRepo.findTemplateWithQuestions.mockResolvedValue({
      id: 10,
      questions: [{ id: 1, label: "Q1", order: 0 }],
    });

    const result = await getStudentDetailsIfLead(1, 1, 10, 100);

    const q0 = result!.performanceSummary.questionAverages[0];
    expect(result!.performanceSummary.totalReviews).toBe(2);
    expect(q0?.averageScore).toBe(4);
    expect(q0?.totalReviews).toBe(2);
    expect(q0?.reviewerAnswers).toHaveLength(2);
  });
});
