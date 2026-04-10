import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  repo: {
    getModuleDetailsIfAuthorised: vi.fn(),
    findModulesForStaff: vi.fn(),
    countSubmittedPAsForModule: vi.fn(),
    countStudentsInModule: vi.fn(),
    findTeamsInModule: vi.fn(),
    countSubmittedPAsForTeam: vi.fn(),
    countStudentsInTeam: vi.fn(),
    findTeamByIdAndModule: vi.fn(),
    getTeamWithAssessments: vi.fn(),
    findTeamMarking: vi.fn(),
    findAssessmentDueDateForTeam: vi.fn(),
    findAssessmentsForRevieweeInTeam: vi.fn(),
    findTemplateWithQuestions: vi.fn(),
    findStudentMarking: vi.fn(),
    isStudentInTeam: vi.fn(),
    upsertTeamMarking: vi.fn(),
    upsertStudentMarking: vi.fn(),
  },
  buildPerformanceSummary: vi.fn(),
}));

vi.mock("./repo.js", () => mocks.repo);
vi.mock("./service.performanceSummary.js", () => ({
  buildPerformanceSummary: mocks.buildPerformanceSummary,
}));

import {
  getProgressForModulesILead,
  getProgressForTeam,
  getModuleDetailsIfLead,
  getTeamDetailsIfLead,
  getStudentDetailsIfLead,
  saveTeamMarkingIfLead,
  saveStudentMarkingIfLead,
} from "./service.js";

const moduleRecord = { id: 1, name: "Software Engineering", archivedAt: null };
const teamRecord = { id: 10, teamName: "Team Alpha" };

describe("peerAssessment staff service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProgressForModulesILead", () => {
    it("returns empty array when staff has no modules", async () => {
      mocks.repo.findModulesForStaff.mockResolvedValue([]);
      const result = await getProgressForModulesILead(1);
      expect(result).toEqual([]);
    });

    it("computes expected = n*(n-1) for each module", async () => {
      mocks.repo.findModulesForStaff.mockResolvedValue([{ id: 1, name: "Mod A" }]);
      mocks.repo.countSubmittedPAsForModule.mockResolvedValue(6);
      mocks.repo.countStudentsInModule.mockResolvedValue(4);
      const result = await getProgressForModulesILead(1);
      expect(result).toEqual([{ id: 1, title: "Mod A", submitted: 6, expected: 12 }]);
    });
  });

  describe("getProgressForTeam", () => {
    it("returns empty array when module has no teams", async () => {
      mocks.repo.findTeamsInModule.mockResolvedValue([]);
      const result = await getProgressForTeam(1);
      expect(result).toEqual([]);
    });

    it("computes progress per team", async () => {
      mocks.repo.findTeamsInModule.mockResolvedValue([{ id: 10, teamName: "Alpha" }]);
      mocks.repo.countSubmittedPAsForTeam.mockResolvedValue(2);
      mocks.repo.countStudentsInTeam.mockResolvedValue(3);
      const result = await getProgressForTeam(1);
      expect(result).toEqual([{ id: 10, title: "Alpha", submitted: 2, expected: 6 }]);
    });
  });

  describe("getModuleDetailsIfLead", () => {
    it("returns null when staff is not authorised for module", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(null);
      const result = await getModuleDetailsIfLead(1, 99);
      expect(result).toBeNull();
    });

    it("returns module details with team progress when authorised", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleRecord);
      mocks.repo.findTeamsInModule.mockResolvedValue([{ id: 10, teamName: "Alpha" }]);
      mocks.repo.countSubmittedPAsForTeam.mockResolvedValue(0);
      mocks.repo.countStudentsInTeam.mockResolvedValue(2);
      const result = await getModuleDetailsIfLead(1, 1);
      expect(result).not.toBeNull();
      expect(result!.module).toEqual({ id: 1, title: "Software Engineering", archivedAt: null });
      expect(result!.teams).toHaveLength(1);
    });
  });

  describe("getTeamDetailsIfLead", () => {
    it("returns null when module not authorised", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(null);
      const result = await getTeamDetailsIfLead(1, 1, 10);
      expect(result).toBeNull();
    });

    it("returns null when team not found in module", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleRecord);
      mocks.repo.findTeamByIdAndModule.mockResolvedValue(null);
      const result = await getTeamDetailsIfLead(1, 1, 10);
      expect(result).toBeNull();
    });

    it("returns team details with sorted students", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleRecord);
      mocks.repo.findTeamByIdAndModule.mockResolvedValue(teamRecord);
      mocks.repo.getTeamWithAssessments.mockResolvedValue({
        members: [
          { id: 2, firstName: "Bob", lastName: "Zane" },
          { id: 1, firstName: "Alice", lastName: "Adams" },
        ],
        assessments: [{ reviewerUserId: 1, revieweeUserId: 2 }],
      });
      mocks.repo.findTeamMarking.mockResolvedValue(null);
      mocks.repo.findAssessmentDueDateForTeam.mockResolvedValue(null);
      const result = await getTeamDetailsIfLead(1, 1, 10);
      expect(result).not.toBeNull();
      expect(result!.students[0].id).toBe(1); // Adams sorted first
      expect(result!.students[1].id).toBe(2);
      expect(result!.teamMarking).toBeNull();
    });

    it("flags students when deadline has passed and they have not submitted all reviews", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleRecord);
      mocks.repo.findTeamByIdAndModule.mockResolvedValue(teamRecord);
      mocks.repo.getTeamWithAssessments.mockResolvedValue({
        members: [
          { id: 1, firstName: "Alice", lastName: "Adams" },
          { id: 2, firstName: "Bob", lastName: "Zane" },
        ],
        assessments: [], // nobody has submitted
      });
      mocks.repo.findTeamMarking.mockResolvedValue(null);
      mocks.repo.findAssessmentDueDateForTeam.mockResolvedValue(new Date("2020-01-01")); // past
      const result = await getTeamDetailsIfLead(1, 1, 10);
      expect(result!.students.every((s: any) => s.flagged)).toBe(true);
    });
  });

  describe("getStudentDetailsIfLead", () => {
    it("returns null when module not authorised", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(null);
      expect(await getStudentDetailsIfLead(1, 1, 10, 2)).toBeNull();
    });

    it("returns null when team not found", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleRecord);
      mocks.repo.findTeamByIdAndModule.mockResolvedValue(null);
      expect(await getStudentDetailsIfLead(1, 1, 10, 2)).toBeNull();
    });

    it("returns null when student not in team", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleRecord);
      mocks.repo.findTeamByIdAndModule.mockResolvedValue(teamRecord);
      mocks.repo.getTeamWithAssessments.mockResolvedValue({ members: [], assessments: [] });
      expect(await getStudentDetailsIfLead(1, 1, 10, 99)).toBeNull();
    });

    it("returns student details with empty performance when no reviews", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleRecord);
      mocks.repo.findTeamByIdAndModule.mockResolvedValue(teamRecord);
      mocks.repo.getTeamWithAssessments.mockResolvedValue({
        members: [{ id: 2, firstName: "Bob", lastName: "Zane" }],
        assessments: [],
      });
      mocks.repo.findAssessmentsForRevieweeInTeam.mockResolvedValue([]);
      mocks.repo.findTeamMarking.mockResolvedValue(null);
      mocks.repo.findStudentMarking.mockResolvedValue(null);
      const result = await getStudentDetailsIfLead(1, 1, 10, 2);
      expect(result).not.toBeNull();
      expect(result!.performanceSummary).toEqual({ overallAverage: 0, totalReviews: 0, questionAverages: [] });
    });

    it("builds performance summary when reviews exist", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleRecord);
      mocks.repo.findTeamByIdAndModule.mockResolvedValue(teamRecord);
      mocks.repo.getTeamWithAssessments.mockResolvedValue({
        members: [{ id: 2, firstName: "Bob", lastName: "Zane" }],
        assessments: [],
      });
      const reviews = [{ id: 1, reviewerUserId: 1, answersJson: "{}", templateId: 5, reviewer: { id: 1, firstName: "Alice", lastName: "A" } }];
      mocks.repo.findAssessmentsForRevieweeInTeam.mockResolvedValue(reviews);
      mocks.repo.findTemplateWithQuestions.mockResolvedValue({ id: 5, questions: [] });
      mocks.repo.findTeamMarking.mockResolvedValue(null);
      mocks.repo.findStudentMarking.mockResolvedValue(null);
      const summary = { overallAverage: 4.2, totalReviews: 1, questionAverages: [] };
      mocks.buildPerformanceSummary.mockReturnValue(summary);
      const result = await getStudentDetailsIfLead(1, 1, 10, 2);
      expect(result!.performanceSummary).toBe(summary);
    });
  });

  describe("saveTeamMarkingIfLead", () => {
    it("returns null when module not authorised", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(null);
      expect(await saveTeamMarkingIfLead(1, 1, 10, { mark: 70, formativeFeedback: null })).toBeNull();
    });

    it("throws MODULE_ARCHIVED when module is archived", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue({ ...moduleRecord, archivedAt: new Date() });
      await expect(saveTeamMarkingIfLead(1, 1, 10, { mark: 70, formativeFeedback: null }))
        .rejects.toEqual({ code: "MODULE_ARCHIVED" });
    });

    it("returns null when team not found in module", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleRecord);
      mocks.repo.findTeamByIdAndModule.mockResolvedValue(null);
      expect(await saveTeamMarkingIfLead(1, 1, 10, { mark: 70, formativeFeedback: null })).toBeNull();
    });

    it("upserts and returns marking on success", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleRecord);
      mocks.repo.findTeamByIdAndModule.mockResolvedValue(teamRecord);
      const savedMarking = {
        mark: 75,
        formativeFeedback: "Good",
        updatedAt: new Date("2026-01-01"),
        marker: { id: 1, firstName: "Dr", lastName: "Smith" },
      };
      mocks.repo.upsertTeamMarking.mockResolvedValue(savedMarking);
      const result = await saveTeamMarkingIfLead(1, 1, 10, { mark: 75, formativeFeedback: "Good" });
      expect(result).toEqual({
        mark: 75,
        formativeFeedback: "Good",
        updatedAt: savedMarking.updatedAt.toISOString(),
        marker: { id: 1, firstName: "Dr", lastName: "Smith" },
      });
    });
  });

  describe("saveStudentMarkingIfLead", () => {
    it("returns null when module not authorised", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(null);
      expect(await saveStudentMarkingIfLead(1, 1, 10, 2, { mark: 80, formativeFeedback: null })).toBeNull();
    });

    it("throws MODULE_ARCHIVED when module is archived", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue({ ...moduleRecord, archivedAt: new Date() });
      await expect(saveStudentMarkingIfLead(1, 1, 10, 2, { mark: 80, formativeFeedback: null }))
        .rejects.toEqual({ code: "MODULE_ARCHIVED" });
    });

    it("returns null when team not found", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleRecord);
      mocks.repo.findTeamByIdAndModule.mockResolvedValue(null);
      expect(await saveStudentMarkingIfLead(1, 1, 10, 2, { mark: 80, formativeFeedback: null })).toBeNull();
    });

    it("returns null when student not in team", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleRecord);
      mocks.repo.findTeamByIdAndModule.mockResolvedValue(teamRecord);
      mocks.repo.isStudentInTeam.mockResolvedValue(false);
      expect(await saveStudentMarkingIfLead(1, 1, 10, 2, { mark: 80, formativeFeedback: null })).toBeNull();
    });

    it("upserts and returns marking on success", async () => {
      mocks.repo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleRecord);
      mocks.repo.findTeamByIdAndModule.mockResolvedValue(teamRecord);
      mocks.repo.isStudentInTeam.mockResolvedValue(true);
      const savedMarking = {
        mark: 80,
        formativeFeedback: "Excellent",
        updatedAt: new Date("2026-02-01"),
        marker: { id: 1, firstName: "Dr", lastName: "Smith" },
      };
      mocks.repo.upsertStudentMarking.mockResolvedValue(savedMarking);
      const result = await saveStudentMarkingIfLead(1, 1, 10, 2, { mark: 80, formativeFeedback: "Excellent" });
      expect(result).not.toBeNull();
      expect(result!.mark).toBe(80);
      expect(mocks.repo.upsertStudentMarking).toHaveBeenCalledWith(
        expect.objectContaining({ teamId: 10, studentUserId: 2, markerUserId: 1 }),
      );
    });
  });
});
