import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn(), findFirst: vi.fn() },
    module: { findFirst: vi.fn(), findMany: vi.fn() },
    userModule: { count: vi.fn() },
    peerAssessment: { count: vi.fn(), findMany: vi.fn() },
    team: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
    teamAllocation: { count: vi.fn(), findMany: vi.fn() },
    questionnaireTemplate: { findUnique: vi.fn() },
    staffTeamMarking: { findUnique: vi.fn(), upsert: vi.fn() },
    staffStudentMarking: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock("../../../shared/db.js", () => ({ prisma: mocks.prisma }));

import {
  getModuleDetailsIfAuthorised,
  findModulesForStaff,
  countStudentsInModule,
  countSubmittedPAsForModule,
  findTeamsInModule,
  countStudentsInTeam,
  countSubmittedPAsForTeam,
  findTeamByIdAndModule,
  findStudentsInTeam,
  getTeamWithAssessments,
  findAssessmentsForRevieweeInTeam,
  findAssessmentDueDateForTeam,
  findTemplateWithQuestions,
  findTeamMarking,
  findStudentMarking,
  isStudentInTeam,
  upsertTeamMarking,
  upsertStudentMarking,
} from "./repo.js";

describe("peerAssessment staff repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getModuleDetailsIfAuthorised", () => {
    it("returns null when staff user not found", async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null);
      const result = await getModuleDetailsIfAuthorised(1, 99);
      expect(result).toBeNull();
    });

    it("returns null when staff user is inactive", async () => {
      mocks.prisma.user.findUnique.mockResolvedValue({ id: 1, enterpriseId: "e1", role: "STAFF", active: false });
      const result = await getModuleDetailsIfAuthorised(1, 1);
      expect(result).toBeNull();
    });

    it("queries without OR filter for admin role", async () => {
      mocks.prisma.user.findUnique.mockResolvedValue({ id: 1, enterpriseId: "e1", role: "ADMIN", active: true });
      mocks.prisma.module.findFirst.mockResolvedValue({ id: 1, name: "Module A", archivedAt: null });
      const result = await getModuleDetailsIfAuthorised(1, 1);
      expect(mocks.prisma.module.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.not.objectContaining({ OR: expect.anything() }) }),
      );
      expect(result).toEqual({ id: 1, name: "Module A", archivedAt: null });
    });

    it("queries with OR filter for STAFF role", async () => {
      mocks.prisma.user.findUnique.mockResolvedValue({ id: 2, enterpriseId: "e1", role: "STAFF", active: true });
      mocks.prisma.module.findFirst.mockResolvedValue(null);
      await getModuleDetailsIfAuthorised(1, 2);
      expect(mocks.prisma.module.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });
  });

  describe("findModulesForStaff", () => {
    it("returns empty array when staff not found", async () => {
      mocks.prisma.user.findUnique.mockResolvedValue(null);
      const result = await findModulesForStaff(99);
      expect(result).toEqual([]);
    });

    it("returns modules without role filter for ENTERPRISE_ADMIN", async () => {
      mocks.prisma.user.findUnique.mockResolvedValue({ id: 1, enterpriseId: "e1", role: "ENTERPRISE_ADMIN", active: true });
      mocks.prisma.module.findMany.mockResolvedValue([{ id: 1, name: "Mod" }]);
      const result = await findModulesForStaff(1);
      expect(result).toHaveLength(1);
      expect(mocks.prisma.module.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.not.objectContaining({ OR: expect.anything() }) }),
      );
    });

    it("filters modules by lead/TA for STAFF role", async () => {
      mocks.prisma.user.findUnique.mockResolvedValue({ id: 2, enterpriseId: "e1", role: "STAFF", active: true });
      mocks.prisma.module.findMany.mockResolvedValue([]);
      await findModulesForStaff(2);
      expect(mocks.prisma.module.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });
  });

  describe("simple count and query wrappers", () => {
    it("countStudentsInModule delegates to prisma", async () => {
      mocks.prisma.userModule.count.mockResolvedValue(30);
      expect(await countStudentsInModule(5)).toBe(30);
      expect(mocks.prisma.userModule.count).toHaveBeenCalledWith({ where: { moduleId: 5 } });
    });

    it("countSubmittedPAsForModule delegates to prisma", async () => {
      mocks.prisma.peerAssessment.count.mockResolvedValue(10);
      expect(await countSubmittedPAsForModule(5)).toBe(10);
    });

    it("findTeamsInModule delegates to prisma", async () => {
      mocks.prisma.team.findMany.mockResolvedValue([{ id: 1, teamName: "Team A" }]);
      const result = await findTeamsInModule(5);
      expect(result).toHaveLength(1);
    });

    it("countStudentsInTeam delegates to prisma", async () => {
      mocks.prisma.teamAllocation.count.mockResolvedValue(4);
      expect(await countStudentsInTeam(10)).toBe(4);
    });

    it("countSubmittedPAsForTeam delegates to prisma", async () => {
      mocks.prisma.peerAssessment.count.mockResolvedValue(6);
      expect(await countSubmittedPAsForTeam(10)).toBe(6);
    });

    it("findTeamByIdAndModule delegates to prisma", async () => {
      mocks.prisma.team.findFirst.mockResolvedValue({ id: 1, teamName: "Alpha" });
      const result = await findTeamByIdAndModule(1, 5);
      expect(result).toEqual({ id: 1, teamName: "Alpha" });
    });

    it("findTemplateWithQuestions delegates to prisma", async () => {
      mocks.prisma.questionnaireTemplate.findUnique.mockResolvedValue({ id: 30, questions: [] });
      const result = await findTemplateWithQuestions(30);
      expect(mocks.prisma.questionnaireTemplate.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 30 } }),
      );
      expect(result).toEqual({ id: 30, questions: [] });
    });

    it("findTeamMarking delegates to prisma", async () => {
      mocks.prisma.staffTeamMarking.findUnique.mockResolvedValue(null);
      const result = await findTeamMarking(1);
      expect(result).toBeNull();
    });

    it("findStudentMarking delegates to prisma", async () => {
      mocks.prisma.staffStudentMarking.findUnique.mockResolvedValue(null);
      const result = await findStudentMarking(1, 2);
      expect(result).toBeNull();
    });
  });

  describe("findStudentsInTeam", () => {
    it("maps allocation rows to user objects", async () => {
      mocks.prisma.teamAllocation.findMany.mockResolvedValue([
        { user: { id: 1, firstName: "Alice", lastName: "Smith" } },
        { user: { id: 2, firstName: "Bob", lastName: "Jones" } },
      ]);
      const result = await findStudentsInTeam(10);
      expect(result).toEqual([
        { id: 1, firstName: "Alice", lastName: "Smith" },
        { id: 2, firstName: "Bob", lastName: "Jones" },
      ]);
    });
  });

  describe("getTeamWithAssessments", () => {
    it("returns members and assessments in parallel", async () => {
      mocks.prisma.teamAllocation.findMany.mockResolvedValue([
        { user: { id: 1, firstName: "Alice", lastName: "Smith" } },
      ]);
      mocks.prisma.peerAssessment.findMany.mockResolvedValue([
        { reviewerUserId: 1, revieweeUserId: 2 },
      ]);
      const result = await getTeamWithAssessments(10);
      expect(result.members).toHaveLength(1);
      expect(result.assessments).toHaveLength(1);
    });
  });

  describe("findAssessmentsForRevieweeInTeam", () => {
    it("delegates to prisma with correct filters", async () => {
      mocks.prisma.peerAssessment.findMany.mockResolvedValue([]);
      await findAssessmentsForRevieweeInTeam(5, 3);
      expect(mocks.prisma.peerAssessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { teamId: 5, revieweeUserId: 3 } }),
      );
    });
  });

  describe("findAssessmentDueDateForTeam", () => {
    it("returns null when team not found", async () => {
      mocks.prisma.team.findUnique.mockResolvedValue(null);
      expect(await findAssessmentDueDateForTeam(99)).toBeNull();
    });

    it("prefers team override date", async () => {
      const overrideDate = new Date("2026-06-01");
      mocks.prisma.team.findUnique.mockResolvedValue({
        deadlineOverride: { assessmentDueDate: overrideDate },
        project: { deadline: { assessmentDueDate: new Date("2026-07-01") } },
      });
      expect(await findAssessmentDueDateForTeam(1)).toBe(overrideDate);
    });

    it("falls back to project deadline when no override", async () => {
      const projectDate = new Date("2026-07-01");
      mocks.prisma.team.findUnique.mockResolvedValue({
        deadlineOverride: null,
        project: { deadline: { assessmentDueDate: projectDate } },
      });
      expect(await findAssessmentDueDateForTeam(1)).toBe(projectDate);
    });

    it("returns null when no deadline anywhere", async () => {
      mocks.prisma.team.findUnique.mockResolvedValue({
        deadlineOverride: null,
        project: { deadline: null },
      });
      expect(await findAssessmentDueDateForTeam(1)).toBeNull();
    });
  });

  describe("isStudentInTeam", () => {
    it("returns true when count > 0", async () => {
      mocks.prisma.teamAllocation.count.mockResolvedValue(1);
      expect(await isStudentInTeam(1, 2)).toBe(true);
    });

    it("returns false when count is 0", async () => {
      mocks.prisma.teamAllocation.count.mockResolvedValue(0);
      expect(await isStudentInTeam(1, 2)).toBe(false);
    });
  });

  describe("upsertTeamMarking", () => {
    it("calls prisma upsert with correct data", async () => {
      const marking = { mark: 75, formativeFeedback: "Good work", updatedAt: new Date(), marker: { id: 1, firstName: "Dr", lastName: "A" } };
      mocks.prisma.staffTeamMarking.upsert.mockResolvedValue(marking);
      const result = await upsertTeamMarking({ teamId: 5, markerUserId: 1, mark: 75, formativeFeedback: "Good work" });
      expect(mocks.prisma.staffTeamMarking.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { teamId: 5 } }),
      );
      expect(result).toBe(marking);
    });
  });

  describe("upsertStudentMarking", () => {
    it("calls prisma upsert with correct data", async () => {
      const marking = { mark: 80, formativeFeedback: "Well done", updatedAt: new Date(), marker: { id: 1, firstName: "Dr", lastName: "B" } };
      mocks.prisma.staffStudentMarking.upsert.mockResolvedValue(marking);
      const result = await upsertStudentMarking({ teamId: 5, studentUserId: 2, markerUserId: 1, mark: 80, formativeFeedback: "Well done" });
      expect(mocks.prisma.staffStudentMarking.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { teamId_studentUserId: { teamId: 5, studentUserId: 2 } } }),
      );
      expect(result).toBe(marking);
    });
  });
});
