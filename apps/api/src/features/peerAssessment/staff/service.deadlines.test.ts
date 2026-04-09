import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTeamDetailsIfLead } from "./service.js";

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

const moduleLead = { id: 1, name: "Module A", archivedAt: null as Date | null };
const teamInModule = { id: 10, teamName: "Team 1" };

describe("peerAssessment/staff service deadlines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleLead);
    mockRepo.findTeamByIdAndModule.mockResolvedValue(teamInModule);
    mockRepo.findTeamMarking.mockResolvedValue(null);
  });

  it("flags students when deadline has passed and submissions are incomplete", async () => {
    mockRepo.getTeamWithAssessments.mockResolvedValue({
      members: [
        { id: 100, firstName: "Alice", lastName: "Smith" },
        { id: 101, firstName: "Bob", lastName: "Jones" },
        { id: 102, firstName: "Carol", lastName: "Lee" },
      ],
      assessments: [{ reviewerUserId: 100, revieweeUserId: 101 }],
    });
    mockRepo.findAssessmentDueDateForTeam.mockResolvedValue(new Date("2020-01-01T00:00:00.000Z"));

    const result = await getTeamDetailsIfLead(1, 1, 10);
    expect(result).not.toBeNull();

    const students = result!.students;
    const bob = students.find((s) => s.id === 101);
    expect(bob?.expected).toBe(2);
    expect(bob?.submitted).toBe(0);
    expect(bob?.flagged).toBe(true);
  });

  it("does not flag students when deadline is in the future", async () => {
    mockRepo.getTeamWithAssessments.mockResolvedValue({
      members: [
        { id: 100, firstName: "Alice", lastName: "Smith" },
        { id: 101, firstName: "Bob", lastName: "Jones" },
      ],
      assessments: [],
    });
    mockRepo.findAssessmentDueDateForTeam.mockResolvedValue(new Date("2999-01-01T00:00:00.000Z"));

    const result = await getTeamDetailsIfLead(1, 1, 10);
    expect(result).not.toBeNull();
    expect(result!.students.every((s) => !s.flagged)).toBe(true);
  });

  it("does not flag students when no assessment due date exists", async () => {
    mockRepo.getTeamWithAssessments.mockResolvedValue({
      members: [
        { id: 100, firstName: "Alice", lastName: "Smith" },
        { id: 101, firstName: "Bob", lastName: "Jones" },
      ],
      assessments: [],
    });
    mockRepo.findAssessmentDueDateForTeam.mockResolvedValue(null);

    const result = await getTeamDetailsIfLead(1, 1, 10);
    expect(result).not.toBeNull();
    expect(result!.students.every((s) => !s.flagged)).toBe(true);
  });
});

