import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  upsertPeerFeedback: vi.fn(),
  getPeerFeedbackByAssessmentId: vi.fn(),
  getPeerFeedbackByAssessmentIds: vi.fn(),
  getPeerAssessmentById: vi.fn(),
}));

vi.mock("./repo.js", () => ({
  upsertPeerFeedback: repoMocks.upsertPeerFeedback,
  getPeerFeedbackByAssessmentId: repoMocks.getPeerFeedbackByAssessmentId,
  getPeerFeedbackByAssessmentIds: repoMocks.getPeerFeedbackByAssessmentIds,
  getPeerAssessmentById: repoMocks.getPeerAssessmentById,
}));

import {
  getFeedbackReview,
  getFeedbackReviewStatuses,
  getPeerAssessment,
  saveFeedbackReview,
} from "./service.js";

describe("peerFeedback service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    });
    expect(result).toBe(expected);
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
});
