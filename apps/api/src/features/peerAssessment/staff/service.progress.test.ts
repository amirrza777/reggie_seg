import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getProgressForModulesILead,
  getModuleDetailsIfLead,
  getTeamDetailsIfLead,
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
  findAssessmentDueDateForTeam: vi.fn(),
  findAssessmentsForRevieweeInTeam: vi.fn(),
  findTemplateWithQuestions: vi.fn(),
  findTeamMarking: vi.fn(),
  findStudentMarking: vi.fn(),
  upsertTeamMarking: vi.fn(),
  upsertStudentMarking: vi.fn(),
  isStudentInTeam: vi.fn(),
}));

import * as repo from "./repo.js";

const mockRepo = vi.mocked(repo);

beforeEach(() => {
  vi.clearAllMocks();
});

const moduleLead = { id: 1, name: "Module A", archivedAt: null as Date | null };
const teamInModule = { id: 10, teamName: "Team 1" };
const twoMembers = [
  { id: 100, firstName: "Alice", lastName: "Smith" },
  { id: 101, firstName: "Bob", lastName: "Jones" },
];

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
    expect(result!.module).toEqual({ id: 1, title: "Module A", archivedAt: null });
    expect(result!.teams).toHaveLength(2);
    expect(result!.teams[0]).toEqual({ id: 10, title: "Team 1", submitted: 2, expected: 12 });
  });

  it.each([
    {
      scenario: "returns null when staff is not module lead",
      module: null as { id: number; name: string; archivedAt: Date | null } | null,
      teams: [] as { id: number; teamName: string }[],
      staffId: 99,
      moduleId: 1,
      expectNull: true,
    },
    {
      scenario: "returns module with empty teams when module has no teams",
      module: { id: 1, name: "Empty Module", archivedAt: null },
      teams: [] as { id: number; teamName: string }[],
      staffId: 1,
      moduleId: 1,
      expectNull: false,
      expectModule: { id: 1, title: "Empty Module", archivedAt: null },
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
    expect(result!.module).toEqual({ id: 1, title: "Module A", archivedAt: null });
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
