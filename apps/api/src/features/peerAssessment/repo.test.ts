import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  teamAllocation: {
    findMany: vi.fn(),
  },
  peerAssessment: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  project: {
    findUnique: vi.fn(),
  },
}));

vi.mock("../../shared/db.js", () => ({
  prisma: prismaMock,
}));

import {
  createPeerAssessment,
  getAssessmentsForReviewee,
  getPeerAssessment,
  getPeerAssessmentById,
  getProjectQuestionnaireTemplate,
  getQuestionsForProject,
  getTeammateAssessments,
  getTeammates,
  updatePeerAssessment,
} from "./repo.js";

describe("peerAssessment repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getTeammates queries team allocations excluding requester", async () => {
    const expected = [{ user: { id: 2, firstName: "Dan" } }];
    prismaMock.teamAllocation.findMany.mockResolvedValue(expected);

    const result = await getTeammates(4, 1);

    expect(prismaMock.teamAllocation.findMany).toHaveBeenCalledWith({
      where: {
        teamId: 1,
        userId: { not: 4 },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    expect(result).toBe(expected);
  });

  it("createPeerAssessment creates record with payload", async () => {
    const data = {
      projectId: 1,
      teamId: 2,
      reviewerUserId: 4,
      revieweeUserId: 5,
      templateId: 6,
      answersJson: [{ questionId: 1, answer: "A" }],
    };
    const expected = { id: 123 };
    prismaMock.peerAssessment.create.mockResolvedValue(expected);

    const result = await createPeerAssessment(data);

    expect(prismaMock.peerAssessment.create).toHaveBeenCalledWith({
      data: {
        projectId: 1,
        teamId: 2,
        reviewerUserId: 4,
        revieweeUserId: 5,
        templateId: 6,
        answersJson: [{ questionId: 1, answer: "A" }],
        submittedLate: false,
        effectiveDueDate: null,
      },
    });
    expect(result).toBe(expected);
  });

  it("getPeerAssessment fetches by composite key with related data", async () => {
    const expected = { id: 88 };
    prismaMock.peerAssessment.findUnique.mockResolvedValue(expected);

    const result = await getPeerAssessment(1, 2, 4, 5);

    expect(prismaMock.peerAssessment.findUnique).toHaveBeenCalledWith({
      where: {
        projectId_teamId_reviewerUserId_revieweeUserId: {
          projectId: 1,
          teamId: 2,
          reviewerUserId: 4,
          revieweeUserId: 5,
        },
      },
      include: {
        reviewee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        questionnaireTemplate: {
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });
    expect(result).toBe(expected);
  });

  it("updatePeerAssessment updates answers and timestamp", async () => {
    const expected = { id: 9 };
    prismaMock.peerAssessment.update.mockResolvedValue(expected);

    const result = await updatePeerAssessment(9, { 1: "Updated answer" });

    expect(prismaMock.peerAssessment.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: {
        answersJson: { 1: "Updated answer" },
        updatedAt: expect.any(Date),
      },
    });
    expect(result).toBe(expected);
  });

  it("getTeammateAssessments fetches reviewer assessments for a project", async () => {
    const expected = [{ id: 1 }, { id: 2 }];
    prismaMock.peerAssessment.findMany.mockResolvedValue(expected);

    const result = await getTeammateAssessments(4, 10);

    expect(prismaMock.peerAssessment.findMany).toHaveBeenCalledWith({
      where: {
        reviewerUserId: 4,
        projectId: 10,
        questionnaireTemplate: { purpose: "PEER_ASSESSMENT" },
      },
      include: {
        reviewee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    expect(result).toBe(expected);
  });

  it("getAssessmentsForReviewee fetches assessments where user is reviewee", async () => {
    const expected = [{ id: 9 }];
    prismaMock.peerAssessment.findMany.mockResolvedValue(expected);

    const result = await getAssessmentsForReviewee(5, 10);

    expect(prismaMock.peerAssessment.findMany).toHaveBeenCalledWith({
      where: {
        revieweeUserId: 5,
        projectId: 10,
        questionnaireTemplate: { purpose: "PEER_ASSESSMENT" },
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    expect(result).toBe(expected);
  });

  it("getQuestionsForProject returns project questionnaire template", async () => {
    const expected = { id: 10 };
    prismaMock.project.findUnique.mockResolvedValue(expected);

    const result = await getQuestionsForProject(10);

    expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
      where: { id: 10 },
      include: {
        questionnaireTemplate: {
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });
    expect(result).toBe(expected);
  });

  it("getProjectQuestionnaireTemplate returns template with ordered questions", async () => {
    const expected = { id: 20 };
    prismaMock.project.findUnique.mockResolvedValue(expected);

    const result = await getProjectQuestionnaireTemplate(20);

    expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
      where: { id: 20 },
      include: {
        questionnaireTemplate: {
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });
    expect(result).toBe(expected);
  });

  it("getPeerAssessmentById returns assessment with template and reviewee", async () => {
    const expected = { id: 30 };
    prismaMock.peerAssessment.findUnique.mockResolvedValue(expected);

    const result = await getPeerAssessmentById(30);

    expect(prismaMock.peerAssessment.findUnique).toHaveBeenCalledWith({
      where: { id: 30 },
      include: {
        questionnaireTemplate: {
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
        reviewee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    expect(result).toBe(expected);
  });
});
