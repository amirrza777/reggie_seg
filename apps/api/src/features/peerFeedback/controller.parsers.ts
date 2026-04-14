import { fail, ok, parsePositiveInt, parsePositiveIntArray, parseTrimmedString, type ParseResult } from "../../shared/parse.js";

const validAgreementOptions = ["Strongly Disagree", "Disagree", "Reasonable", "Agree", "Strongly Agree"] as const;

type AgreementValue = { selected: (typeof validAgreementOptions)[number]; score: number };

function parseBodyRecord(body: unknown, error = "Invalid request body"): ParseResult<Record<string, unknown>> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail(error);
  }
  return ok(body as Record<string, unknown>);
}

export function parseFeedbackIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "feedbackId");
  return parsed.ok ? parsed : fail("Invalid feedback ID");
}

export function parseCreatePeerFeedbackBody(body: unknown): ParseResult<{
  reviewText: string;
  agreements: Record<string, AgreementValue>;
  reviewerUserId: unknown;
  revieweeUserId: unknown;
}> {
  const parsedBody = parseBodyRecord(body);
  if (!parsedBody.ok) return parsedBody;

  const agreements = parsedBody.value.agreements;
  if (typeof agreements !== "object" || !agreements || Array.isArray(agreements)) {
    return fail("Invalid agreements object");
  }

  const parsedAgreements: Record<string, AgreementValue> = {};
  for (const [answerId, value] of Object.entries(agreements)) {
    if (typeof value !== "object" || !value || Array.isArray(value)) {
      return fail(`Invalid agreement value for ${answerId}`);
    }
    const selected = (value as Record<string, unknown>).selected;
    const score = (value as Record<string, unknown>).score;
    if (!validAgreementOptions.includes(selected as AgreementValue["selected"]) || typeof score !== "number" || score < 1 || score > 5) {
      return fail(`Invalid agreement option or score for ${answerId}`);
    }
    parsedAgreements[answerId] = { selected: selected as AgreementValue["selected"], score };
  }

  const reviewText = typeof parsedBody.value.reviewText === "string" ? parsedBody.value.reviewText : "";

  return ok({
    reviewText,
    agreements: parsedAgreements,
    reviewerUserId: parsedBody.value.reviewerUserId,
    revieweeUserId: parsedBody.value.revieweeUserId,
  });
}

export function parseFeedbackStatusesBody(body: unknown): ParseResult<{ feedbackIds: number[] }> {
  const parsedBody = parseBodyRecord(body, "feedbackIds must be an array");
  if (!parsedBody.ok) return parsedBody;

  if (!Array.isArray(parsedBody.value.feedbackIds)) {
    return fail("feedbackIds must be an array");
  }
  const feedbackIds = parsePositiveIntArray(parsedBody.value.feedbackIds, "feedbackIds");
  if (!feedbackIds.ok) return fail("feedbackIds must contain only numeric IDs");
  return ok({ feedbackIds: feedbackIds.value });
}

export function parsePeerAssessmentReviewsBody(body: unknown): ParseResult<{ peerAssessmentIds: number[] }> {
  const parsedBody = parseBodyRecord(body, "peerAssessmentIds must be an array");
  if (!parsedBody.ok) return parsedBody;

  if (!Array.isArray(parsedBody.value.peerAssessmentIds)) {
    return fail("peerAssessmentIds must be an array");
  }
  const peerAssessmentIds = parsePositiveIntArray(parsedBody.value.peerAssessmentIds, "peerAssessmentIds");
  if (!peerAssessmentIds.ok) return fail("peerAssessmentIds must contain only numeric IDs");
  return ok({ peerAssessmentIds: peerAssessmentIds.value });
}
