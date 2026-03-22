import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();
const mapApiAssessmentToPeerFeedbackMock = vi.fn();
const mapApiAssessmentsToPeerFeedbacksMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

vi.mock("./mapper", () => ({
  mapApiAssessmentToPeerFeedback: (...args: unknown[]) =>
    mapApiAssessmentToPeerFeedbackMock(...args),
  mapApiAssessmentsToPeerFeedbacks: (...args: unknown[]) =>
    mapApiAssessmentsToPeerFeedbacksMock(...args),
}));

import {
  getFeedbackReview,
  getFeedbackReviewStatuses,
  getPeerAssessmentsForUser,
  getPeerFeedbackById,
  submitFeedback,
  submitPeerFeedback,
} from "./client";

describe("peer feedback api client wrappers", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    mapApiAssessmentToPeerFeedbackMock.mockReset();
    mapApiAssessmentsToPeerFeedbacksMock.mockReset();
  });

  it("submitFeedback posts to peer-assessments endpoint", async () => {
    apiFetchMock.mockResolvedValue({ ok: true });

    await submitFeedback({
      projectId: "1",
      answers: { q1: "A" },
      anonymous: false,
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/peer-assessments", {
      method: "POST",
      body: JSON.stringify({
        projectId: "1",
        answers: { q1: "A" },
        anonymous: false,
      }),
    });
  });

  it("getPeerFeedbackById fetches feedback and maps it", async () => {
    const raw = { id: 10 };
    const mapped = { id: "10" };
    apiFetchMock.mockResolvedValue(raw);
    mapApiAssessmentToPeerFeedbackMock.mockReturnValue(mapped);

    const result = await getPeerFeedbackById("10");

    expect(apiFetchMock).toHaveBeenCalledWith("/peer-feedback/feedback/10");
    expect(mapApiAssessmentToPeerFeedbackMock).toHaveBeenCalledWith(raw);
    expect(result).toEqual(mapped);
  });

  it("getPeerAssessmentsForUser fetches list and maps it", async () => {
    const raw = { data: [{ id: 1 }] };
    const mapped = [{ id: "1" }];
    apiFetchMock.mockResolvedValue(raw);
    mapApiAssessmentsToPeerFeedbacksMock.mockReturnValue(mapped);

    const result = await getPeerAssessmentsForUser("4", "1");

    expect(apiFetchMock).toHaveBeenCalledWith("/peer-assessments/projects/1/user/4");
    expect(mapApiAssessmentsToPeerFeedbacksMock).toHaveBeenCalledWith(raw);
    expect(result).toEqual(mapped);
  });

  it("getFeedbackReview fetches review endpoint", async () => {
    apiFetchMock.mockResolvedValue({ id: 99 });

    await getFeedbackReview("99");

    expect(apiFetchMock).toHaveBeenCalledWith("/peer-feedback/feedback/99/review");
  });

  it("getFeedbackReviewStatuses posts bulk ids and returns status map", async () => {
    apiFetchMock.mockResolvedValue({
      statuses: { "12": true, "13": false },
    });

    const result = await getFeedbackReviewStatuses(["12", "13"]);

    expect(apiFetchMock).toHaveBeenCalledWith("/peer-feedback/feedback/reviews/statuses", {
      method: "POST",
      body: JSON.stringify({ feedbackIds: ["12", "13"] }),
    });
    expect(result).toEqual({ "12": true, "13": false });
  });

  it("submitPeerFeedback posts payload with reviewer and reviewee ids", async () => {
    apiFetchMock.mockResolvedValue({ ok: true });

    await submitPeerFeedback(
      "12",
      {
        reviewText: "Thanks",
        agreements: {
          q1: { selected: "Agree", score: 4 },
        },
      },
      "4",
      "9",
    );

    expect(apiFetchMock).toHaveBeenCalledWith("/peer-feedback/feedback/12/review", {
      method: "POST",
      body: JSON.stringify({
        reviewText: "Thanks",
        agreements: {
          q1: { selected: "Agree", score: 4 },
        },
        reviewerUserId: "4",
        revieweeUserId: "9",
      }),
    });
  });
});
