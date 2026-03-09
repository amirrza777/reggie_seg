import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countStudentsInModule,
  countStudentsInTeam,
  countSubmittedPAsForModule,
  countSubmittedPAsForTeam,
  findAssessmentsForRevieweeInTeam,
  findModulesForStaff,
  findStudentsInTeam,
  findTeamByIdAndModule,
  findTeamsInModule,
  findTemplateWithQuestions,
  getModuleDetailsIfAuthorised,
  getTeamWithAssessments,
} from "./repo.js";
import { prisma } from "../../../shared/db.js";

vi.mock("../../../shared/db.js", () => ({
  prisma: {
    module: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    userModule: {
      count: vi.fn(),
    },
    peerAssessment: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    team: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    teamAllocation: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    questionnaireTemplate: {
      findUnique: vi.fn(),
    },
  },
}));

describe("peerAssessment/staff repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getModuleDetailsIfAuthorised queries module id and selects summary fields", async () => {
    await getModuleDetailsIfAuthorised(4, 99);
    expect(prisma.module.findFirst).toHaveBeenCalledWith({
      where: { id: 4 },
      select: { id: true, name: true },
    });
  });

  it("find/count helpers query expected models", async () => {
    await findModulesForStaff(1);
    expect(prisma.module.findMany).toHaveBeenCalledWith({ where: {} });

    await countStudentsInModule(5);
    expect(prisma.userModule.count).toHaveBeenCalledWith({ where: { moduleId: 5 } });

    await countSubmittedPAsForModule(5);
    expect(prisma.peerAssessment.count).toHaveBeenCalledWith({ where: { project: { moduleId: 5 } } });

    await findTeamsInModule(7);
    expect(prisma.team.findMany).toHaveBeenCalledWith({
      where: { project: { moduleId: 7 } },
      orderBy: { teamName: "asc" },
    });

    await countStudentsInTeam(8);
    expect(prisma.teamAllocation.count).toHaveBeenCalledWith({ where: { teamId: 8 } });

    await countSubmittedPAsForTeam(8);
    expect(prisma.peerAssessment.count).toHaveBeenCalledWith({ where: { teamId: 8 } });
  });

  it("findTeamByIdAndModule queries team constrained by module", async () => {
    await findTeamByIdAndModule(10, 2);
    expect(prisma.team.findFirst).toHaveBeenCalledWith({
      where: { id: 10, project: { moduleId: 2 } },
      select: { id: true, teamName: true },
    });
  });

  it("findStudentsInTeam maps rows to user objects", async () => {
    (prisma.teamAllocation.findMany as any).mockResolvedValue([
      { user: { id: 1, firstName: "A", lastName: "B" } },
      { user: { id: 2, firstName: "C", lastName: "D" } },
    ]);

    await expect(findStudentsInTeam(12)).resolves.toEqual([
      { id: 1, firstName: "A", lastName: "B" },
      { id: 2, firstName: "C", lastName: "D" },
    ]);
    expect(prisma.teamAllocation.findMany).toHaveBeenCalledWith({
      where: { teamId: 12 },
      select: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  });

  it("getTeamWithAssessments returns members and assessment pairs", async () => {
    (prisma.teamAllocation.findMany as any).mockResolvedValue([{ user: { id: 1, firstName: "A", lastName: "B" } }]);
    (prisma.peerAssessment.findMany as any).mockResolvedValue([{ reviewerUserId: 1, revieweeUserId: 2 }]);

    const result = await getTeamWithAssessments(6);

    expect(prisma.peerAssessment.findMany).toHaveBeenCalledWith({
      where: { teamId: 6 },
      select: { reviewerUserId: true, revieweeUserId: true },
    });
    expect(result).toEqual({
      members: [{ id: 1, firstName: "A", lastName: "B" }],
      assessments: [{ reviewerUserId: 1, revieweeUserId: 2 }],
    });
  });

  it("findAssessmentsForRevieweeInTeam queries selected reviewer fields", async () => {
    await findAssessmentsForRevieweeInTeam(5, 20);
    expect(prisma.peerAssessment.findMany).toHaveBeenCalledWith({
      where: { teamId: 5, revieweeUserId: 20 },
      select: {
        id: true,
        reviewerUserId: true,
        answersJson: true,
        questionnaireTemplateId: true,
        reviewer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  });

  it("findTemplateWithQuestions queries template with ordered questions", async () => {
    await findTemplateWithQuestions(30);
    expect(prisma.questionnaireTemplate.findUnique).toHaveBeenCalledWith({
      where: { id: 30 },
      select: {
        id: true,
        questions: {
          orderBy: { order: "asc" },
          select: { id: true, label: true, order: true },
        },
      },
    });
  });
});
