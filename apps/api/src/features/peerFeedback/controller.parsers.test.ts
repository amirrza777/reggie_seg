import { describe, expect, it } from "vitest";
import {
  parseCreatePeerFeedbackBody,
  parseFeedbackIdParam,
  parseFeedbackStatusesBody,
} from "./controller.parsers.js";

describe("peerFeedback controller parsers", () => {
  it("parses feedback ids and status bodies", () => {
    expect(parseFeedbackIdParam("4")).toEqual({ ok: true, value: 4 });
    expect(parseFeedbackStatusesBody({ feedbackIds: [1, "2"] })).toEqual({
      ok: true,
      value: { feedbackIds: [1, 2] },
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
});
