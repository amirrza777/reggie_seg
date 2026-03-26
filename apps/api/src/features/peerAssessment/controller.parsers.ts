import {
  fail,
  ok,
  parsePositiveInt,
  type ParseResult,
} from "../../shared/parse.js";

function parseBodyRecord(body: unknown, error = "Invalid request body"): ParseResult<Record<string, unknown>> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail(error);
  }
  return ok(body as Record<string, unknown>);
}

export function parseUserIdAndTeamIdQuery(req: { query: { userId?: unknown }; params: { teamId?: unknown } }): ParseResult<{
  userId: number;
  teamId: number;
}> {
  const userId = parsePositiveInt(req.query.userId, "userId");
  const teamId = parsePositiveInt(req.params.teamId, "teamId");
  if (!userId.ok || !teamId.ok) return fail("Invalid user ID or team ID");
  return ok({ userId: userId.value, teamId: teamId.value });
}

export function parseCreateAssessmentBody(body: unknown): ParseResult<{
  projectId: number;
  teamId: number;
  reviewerUserId: number;
  revieweeUserId: number;
  templateId: number;
  answersJson: unknown;
}> {
  const parsedBody = parseBodyRecord(body);
  if (!parsedBody.ok) return parsedBody;

  const projectId = parsePositiveInt(parsedBody.value.projectId, "projectId");
  const teamId = parsePositiveInt(parsedBody.value.teamId, "teamId");
  const reviewerUserId = parsePositiveInt(parsedBody.value.reviewerUserId, "reviewerUserId");
  const revieweeUserId = parsePositiveInt(parsedBody.value.revieweeUserId, "revieweeUserId");
  const templateId = parsePositiveInt(parsedBody.value.templateId, "templateId");
  const answersJson = parsedBody.value.answersJson;

  if (!projectId.ok || !teamId.ok || !reviewerUserId.ok || !revieweeUserId.ok || !templateId.ok || answersJson == null) {
    return fail("Invalid request body");
  }

  return ok({
    projectId: projectId.value,
    teamId: teamId.value,
    reviewerUserId: reviewerUserId.value,
    revieweeUserId: revieweeUserId.value,
    templateId: templateId.value,
    answersJson,
  });
}

export function parseAssessmentQuery(req: {
  query: { projectId?: unknown; teamId?: unknown; reviewerId?: unknown; revieweeId?: unknown };
}): ParseResult<{ projectId: number; teamId: number; reviewerId: number; revieweeId: number }> {
  const projectId = parsePositiveInt(req.query.projectId, "projectId");
  const teamId = parsePositiveInt(req.query.teamId, "teamId");
  const reviewerId = parsePositiveInt(req.query.reviewerId, "reviewerId");
  const revieweeId = parsePositiveInt(req.query.revieweeId, "revieweeId");
  if (!projectId.ok || !teamId.ok || !reviewerId.ok || !revieweeId.ok) {
    return fail("Invalid query parameters");
  }
  return ok({ projectId: projectId.value, teamId: teamId.value, reviewerId: reviewerId.value, revieweeId: revieweeId.value });
}

export function parseAssessmentIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "id");
  return parsed.ok ? parsed : fail("Invalid assessment ID");
}

export function parseAssessmentAnswersBody(body: unknown): ParseResult<{ answersJson: unknown }> {
  const parsedBody = parseBodyRecord(body);
  if (!parsedBody.ok || parsedBody.value.answersJson == null) {
    return fail("Invalid request body");
  }
  return ok({ answersJson: parsedBody.value.answersJson });
}

export function parseUserIdAndProjectIdParams(req: { params: { userId?: unknown; projectId?: unknown } }): ParseResult<{
  userId: number;
  projectId: number;
}> {
  const userId = parsePositiveInt(req.params.userId, "userId");
  const projectId = parsePositiveInt(req.params.projectId, "projectId");
  if (!userId.ok || !projectId.ok) return fail("Invalid user ID or project ID");
  return ok({ userId: userId.value, projectId: projectId.value });
}

export function parseProjectIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "projectId");
  return parsed.ok ? parsed : fail("Invalid project ID");
}
