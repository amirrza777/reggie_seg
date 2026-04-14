import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  upsertPeerFeedback: vi.fn(),
  getPeerFeedbackByAssessmentId: vi.fn(),
  getPeerFeedbackByAssessmentIds: vi.fn(),
  getPeerAssessmentById: vi.fn(),
  listPeerFeedbackReviewsByPeerAssessmentIds: vi.fn(),
}));

const prismaMocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  peerAssessmentFindMany: vi.fn(),
}));

const staffRepoMocks = vi.hoisted(() => ({
  getModuleDetailsIfAuthorised: vi.fn(),
}));

const projectServiceMocks = vi.hoisted(() => ({
  fetchProjectDeadline: vi.fn(),
}));

vi.mock("./repo.js", () => ({
  upsertPeerFeedback: repoMocks.upsertPeerFeedback,
  getPeerFeedbackByAssessmentId: repoMocks.getPeerFeedbackByAssessmentId,
  getPeerFeedbackByAssessmentIds: repoMocks.getPeerFeedbackByAssessmentIds,
  getPeerAssessmentById: repoMocks.getPeerAssessmentById,
  listPeerFeedbackReviewsByPeerAssessmentIds: repoMocks.listPeerFeedbackReviewsByPeerAssessmentIds,
}));

vi.mock("../../shared/db.js", () => ({
  prisma: {
    user: { findUnique: prismaMocks.userFindUnique },
    peerAssessment: { findMany: prismaMocks.peerAssessmentFindMany },
  },
}));

vi.mock("../peerAssessment/staff/repo.js", () => ({
  getModuleDetailsIfAuthorised: staffRepoMocks.getModuleDetailsIfAuthorised,
}));

vi.mock("../projects/service.js", () => ({
  fetchProjectDeadline: projectServiceMocks.fetchProjectDeadline,
}));

import {
  getFeedbackReview,
  getFeedbackReviewStatuses,
  getFeedbackReviewsForViewer,
  getPeerAssessment,
  saveFeedbackReview,
} from "./service.js";

describe("peerFeedback service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.userFindUnique.mockReset();
    prismaMocks.peerAssessmentFindMany.mockReset();
    staffRepoMocks.getModuleDetailsIfAuthorised.mockReset();
    repoMocks.listPeerFeedbackReviewsByPeerAssessmentIds.mockReset();
    repoMocks.getPeerAssessmentById.mockResolvedValue({ id: 4, projectId: 11 });
    projectServiceMocks.fetchProjectDeadline.mockResolvedValue({
      feedbackOpenDate: new Date("2026-03-01T09:00:00.000Z"),
      feedbackDueDate: new Date("3026-03-31T23:59:59.000Z"),
    });
  });

  it("saveFeedbackReview forwards mapped payload to repo with numeric user ids", async () => {
    const payload = {
      reviewText: "Well done",
      agreements: { "1": { selected: "Agree", score: 4 } },
      reviewerUserId: "6",
      revieweeUserId: "9",
    };
    const expected = { id: 100 };
    repoMocks.upsertPeerFeedback.mockResolvedValue(expected);

    const result = await saveFeedbackReview(4, payload);

    expect(repoMocks.upsertPeerFeedback).toHaveBeenCalledWith({
      peerAssessmentId: 4,
      reviewerUserId: 6,
      revieweeUserId: 9,
      reviewText: "Well done",
      agreementsJson: payload.agreements,
      submittedLate: false,
      effectiveDueDate: new Date("3026-03-31T23:59:59.000Z"),
    });
    expect(result).toBe(expected);
  });

  it("saveFeedbackReview throws when peer assessment is missing", async () => {
    repoMocks.getPeerAssessmentById.mockResolvedValue(null);

    await expect(
      saveFeedbackReview(4, {
        reviewText: "Well done",
        agreements: { "1": { selected: "Agree", score: 4 } },
        reviewerUserId: "6",
        revieweeUserId: "9",
      }),
    ).rejects.toMatchObject({ code: "PEER_ASSESSMENT_NOT_FOUND" });
  });

  it("saveFeedbackReview allows late feedback and marks it", async () => {
    projectServiceMocks.fetchProjectDeadline.mockResolvedValue({
      feedbackOpenDate: new Date("2020-03-01T09:00:00.000Z"),
      feedbackDueDate: new Date("2020-03-31T23:59:59.000Z"),
    });
    repoMocks.upsertPeerFeedback.mockResolvedValue({ id: 200 });

    await expect(
      saveFeedbackReview(4, {
        reviewText: "Well done",
        agreements: { "1": { selected: "Agree", score: 4 } },
        reviewerUserId: "6",
        revieweeUserId: "9",
      }),
    ).resolves.toEqual({ id: 200 });
    expect(repoMocks.upsertPeerFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        submittedLate: true,
        effectiveDueDate: new Date("2020-03-31T23:59:59.000Z"),
      }),
    );
  });

  it("getFeedbackReview forwards assessment id to repo", async () => {
    const expected = { id: 11 };
    repoMocks.getPeerFeedbackByAssessmentId.mockResolvedValue(expected);

    const result = await getFeedbackReview(11);

    expect(repoMocks.getPeerFeedbackByAssessmentId).toHaveBeenCalledWith(11);
    expect(result).toBe(expected);
  });

  it("getFeedbackReviewStatuses returns boolean map for requested ids", async () => {
    repoMocks.getPeerFeedbackByAssessmentIds.mockResolvedValue([
      { peerAssessmentId: 11 },
      { peerAssessmentId: 13 },
    ]);

    const result = await getFeedbackReviewStatuses([10, 11, 12, 13]);

    expect(repoMocks.getPeerFeedbackByAssessmentIds).toHaveBeenCalledWith([10, 11, 12, 13]);
    expect(result).toEqual({
      "10": false,
      "11": true,
      "12": false,
      "13": true,
    });
  });

  it("getPeerAssessment forwards assessment id to repo", async () => {
    const expected = { id: 22 };
    repoMocks.getPeerAssessmentById.mockResolvedValue(expected);

    const result = await getPeerAssessment(22);

    expect(repoMocks.getPeerAssessmentById).toHaveBeenCalledWith(22);
    expect(result).toBe(expected);
  });

  it("getFeedbackReviewsForViewer returns empty map for inactive user", async () => {
    prismaMocks.userFindUnique.mockResolvedValue(null);
    await expect(getFeedbackReviewsForViewer(5, [1, 2])).resolves.toEqual({});
    expect(prismaMocks.peerAssessmentFindMany).not.toHaveBeenCalled();
  });

  it("getFeedbackReviewsForViewer returns reviews when viewer is reviewee", async () => {
    prismaMocks.userFindUnique.mockResolvedValue({
      id: 9,
      role: "STUDENT",
      enterpriseId: "e1",
      active: true,
    });
    prismaMocks.peerAssessmentFindMany.mockResolvedValue([
      {
        id: 40,
        reviewerUserId: 8,
        revieweeUserId: 9,
        project: { moduleId: 3, module: { enterpriseId: "e1" } },
      },
    ]);
    repoMocks.listPeerFeedbackReviewsByPeerAssessmentIds.mockResolvedValue([
      { peerAssessmentId: 40, reviewText: "Thanks", agreementsJson: { "1": { selected: "Agree", score: 4 } } },
    ]);

    const result = await getFeedbackReviewsForViewer(9, [40]);

    expect(repoMocks.listPeerFeedbackReviewsByPeerAssessmentIds).toHaveBeenCalledWith([40]);
    expect(result["40"]).toEqual({
      reviewText: "Thanks",
      agreementsJson: { "1": { selected: "Agree", score: 4 } },
    });
  });

  it("getFeedbackReviewsForViewer uses module access for staff viewers", async () => {
    prismaMocks.userFindUnique.mockResolvedValue({
      id: 50,
      role: "STAFF",
      enterpriseId: "e1",
      active: true,
    });
    prismaMocks.peerAssessmentFindMany.mockResolvedValue([
      {
        id: 41,
        reviewerUserId: 8,
        revieweeUserId: 9,
        project: { moduleId: 7, module: { enterpriseId: "e1" } },
      },
    ]);
    staffRepoMocks.getModuleDetailsIfAuthorised.mockResolvedValue({ id: 7, name: "Mod", archivedAt: null });
    repoMocks.listPeerFeedbackReviewsByPeerAssessmentIds.mockResolvedValue([
      { peerAssessmentId: 41, reviewText: null, agreementsJson: {} },
    ]);

    const result = await getFeedbackReviewsForViewer(50, [41]);

    expect(staffRepoMocks.getModuleDetailsIfAuthorised).toHaveBeenCalledWith(7, 50);
    expect(result["41"]).toEqual({ reviewText: null, agreementsJson: {} });
  });
});
