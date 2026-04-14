import { describe, expect, it } from "vitest";
import {
  parseCreatePeerFeedbackBody,
  parseFeedbackIdParam,
  parseFeedbackStatusesBody,
  parsePeerAssessmentReviewsBody,
} from "./controller.parsers.js";

describe("peerFeedback controller parsers", () => {
  it("parses feedback ids and status bodies", () => {
    expect(parseFeedbackIdParam("4")).toEqual({ ok: true, value: 4 });
    expect(parseFeedbackStatusesBody({ feedbackIds: [1, "2"] })).toEqual({
      ok: true,
      value: { feedbackIds: [1, 2] },
    });
    expect(parsePeerAssessmentReviewsBody({ peerAssessmentIds: [10, "11"] })).toEqual({
      ok: true,
      value: { peerAssessmentIds: [10, 11] },
    });
  });

  it("parses feedback create payloads", () => {
    expect(
      parseCreatePeerFeedbackBody({
        reviewText: "Nice work",
        reviewerUserId: "6",
        revieweeUserId: "9",
        agreements: { "1": { selected: "Agree", score: 4 } },
      }),
    ).toEqual({
      ok: true,
      value: {
        reviewText: "Nice work",
        reviewerUserId: "6",
        revieweeUserId: "9",
        agreements: { "1": { selected: "Agree", score: 4 } },
      },
    });
  });

  it("normalizes parser errors for invalid ids and invalid body shapes", () => {
    expect(parseFeedbackIdParam("0")).toEqual({ ok: false, error: "Invalid feedback ID" });
    expect(parseFeedbackStatusesBody(null)).toEqual({ ok: false, error: "feedbackIds must be an array" });
    expect(parseFeedbackStatusesBody({ feedbackIds: [1, "x"] })).toEqual({
      ok: false,
      error: "feedbackIds must contain only numeric IDs",
    });
    expect(parsePeerAssessmentReviewsBody(null)).toEqual({ ok: false, error: "peerAssessmentIds must be an array" });
    expect(parsePeerAssessmentReviewsBody({ peerAssessmentIds: [1, "x"] })).toEqual({
      ok: false,
      error: "peerAssessmentIds must contain only numeric IDs",
    });
  });

  it("rejects invalid agreement objects and options", () => {
    expect(parseCreatePeerFeedbackBody({ agreements: [] })).toEqual({
      ok: false,
      error: "Invalid agreements object",
    });
    expect(
      parseCreatePeerFeedbackBody({
        agreements: { "1": "invalid" },
      }),
    ).toEqual({
      ok: false,
      error: "Invalid agreement value for 1",
    });
    expect(
      parseCreatePeerFeedbackBody({
        agreements: { "1": { selected: "Nope", score: 7 } },
      }),
    ).toEqual({
      ok: false,
      error: "Invalid agreement option or score for 1",
    });
  });
});
