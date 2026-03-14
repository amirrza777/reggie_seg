import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  upsertPeerFeedback: vi.fn(),
  getPeerFeedbackByAssessmentId: vi.fn(),
  getPeerAssessmentById: vi.fn(),
}));

const projectServiceMocks = vi.hoisted(() => ({
  fetchProjectDeadline: vi.fn(),
}));

vi.mock("./repo.js", () => ({
  upsertPeerFeedback: repoMocks.upsertPeerFeedback,
  getPeerFeedbackByAssessmentId: repoMocks.getPeerFeedbackByAssessmentId,
  getPeerAssessmentById: repoMocks.getPeerAssessmentById,
}));

vi.mock("../projects/service.js", () => ({
  fetchProjectDeadline: projectServiceMocks.fetchProjectDeadline,
}));

import {
  getFeedbackReview,
  getPeerAssessment,
  saveFeedbackReview,
} from "./service.js";

describe("peerFeedback service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMocks.getPeerAssessmentById.mockResolvedValue({ id: 4, projectId: 11 });
    projectServiceMocks.fetchProjectDeadline.mockResolvedValue({
      feedbackOpenDate: new Date("2026-03-01T09:00:00.000Z"),
      feedbackDueDate: new Date("2026-03-31T23:59:59.000Z"),
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
      effectiveDueDate: new Date("2026-03-31T23:59:59.000Z"),
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

  it("getPeerAssessment forwards assessment id to repo", async () => {
    const expected = { id: 22 };
    repoMocks.getPeerAssessmentById.mockResolvedValue(expected);

    const result = await getPeerAssessment(22);

    expect(repoMocks.getPeerAssessmentById).toHaveBeenCalledWith(22);
    expect(result).toBe(expected);
  });
});
