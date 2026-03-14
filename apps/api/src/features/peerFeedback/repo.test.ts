import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  peerAssessment: {
    findUnique: vi.fn(),
  },
  peerFeedback: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("../../shared/db.js", () => ({
  prisma: prismaMock,
}));

import {
  getPeerAssessmentById,
  getPeerFeedbackByAssessmentId,
  upsertPeerFeedback,
} from "./repo.js";

describe("peerFeedback repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upsertPeerFeedback throws when peer assessment does not exist", async () => {
    prismaMock.peerAssessment.findUnique.mockResolvedValue(null);

    await expect(
      upsertPeerFeedback({
        peerAssessmentId: 4,
        reviewerUserId: 6,
        revieweeUserId: 9,
        reviewText: "text",
        agreementsJson: { "1": { selected: "Agree", score: 4 } },
      }),
    ).rejects.toThrow("Peer assessment not found");

    expect(prismaMock.peerAssessment.findUnique).toHaveBeenCalledWith({
      where: { id: 4 },
      select: { teamId: true },
    });
    expect(prismaMock.peerFeedback.upsert).not.toHaveBeenCalled();
  });

  it("upsertPeerFeedback upserts feedback using derived team id", async () => {
    prismaMock.peerAssessment.findUnique.mockResolvedValue({ teamId: 12 });
    const expected = { id: 77 };
    prismaMock.peerFeedback.upsert.mockResolvedValue(expected);

    const result = await upsertPeerFeedback({
      peerAssessmentId: 4,
      reviewerUserId: 6,
      revieweeUserId: 9,
      reviewText: "Constructive review",
      agreementsJson: { "1": { selected: "Agree", score: 4 } },
    });

    expect(prismaMock.peerFeedback.upsert).toHaveBeenCalledWith({
      where: { peerAssessmentId: 4 },
      update: {
        reviewerUserId: 6,
        revieweeUserId: 9,
        reviewText: "Constructive review",
        agreementsJson: { "1": { selected: "Agree", score: 4 } },
        updatedAt: expect.any(Date),
      },
      create: {
        peerAssessmentId: 4,
        teamId: 12,
        reviewerUserId: 6,
        revieweeUserId: 9,
        reviewText: "Constructive review",
        agreementsJson: { "1": { selected: "Agree", score: 4 } },
        submittedLate: false,
        effectiveDueDate: null,
      },
      include: {
        peerAssessment: {
          select: {
            id: true,
            reviewerUserId: true,
            revieweeUserId: true,
            projectId: true,
            answersJson: true,
            questionnaireTemplate: {
              select: {
                questions: {
                  select: {
                    id: true,
                    label: true,
                    order: true,
                  },
                },
              },
            },
            reviewee: { select: { firstName: true, lastName: true } },
            reviewer: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    expect(result).toBe(expected);
  });

  it("upsertPeerFeedback maps undefined reviewText to null", async () => {
    prismaMock.peerAssessment.findUnique.mockResolvedValue({ teamId: 12 });
    prismaMock.peerFeedback.upsert.mockResolvedValue({ id: 1 });

    await upsertPeerFeedback({
      peerAssessmentId: 4,
      reviewerUserId: 6,
      revieweeUserId: 9,
      agreementsJson: {},
    });

    expect(prismaMock.peerFeedback.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ reviewText: null }),
        create: expect.objectContaining({ reviewText: null, submittedLate: false, effectiveDueDate: null }),
      }),
    );
  });

  it("getPeerFeedbackByAssessmentId includes assessment and questions", async () => {
    const expected = { id: 33 };
    prismaMock.peerFeedback.findUnique.mockResolvedValue(expected);

    const result = await getPeerFeedbackByAssessmentId(15);

    expect(prismaMock.peerFeedback.findUnique).toHaveBeenCalledWith({
      where: { peerAssessmentId: 15 },
      include: {
        peerAssessment: {
          select: {
            id: true,
            reviewerUserId: true,
            revieweeUserId: true,
            projectId: true,
            answersJson: true,
            questionnaireTemplate: {
              select: {
                questions: {
                  select: {
                    id: true,
                    label: true,
                    order: true,
                  },
                },
              },
            },
            reviewee: { select: { firstName: true, lastName: true } },
            reviewer: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    expect(result).toBe(expected);
  });

  it("getPeerAssessmentById includes reviewee and ordered template questions", async () => {
    const expected = { id: 55 };
    prismaMock.peerAssessment.findUnique.mockResolvedValue(expected);

    const result = await getPeerAssessmentById(55);

    expect(prismaMock.peerAssessment.findUnique).toHaveBeenCalledWith({
      where: { id: 55 },
      include: {
        reviewee: {
          select: { id: true, firstName: true, lastName: true },
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
});
