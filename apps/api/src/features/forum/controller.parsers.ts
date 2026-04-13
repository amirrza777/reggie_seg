import {
  fail,
  ok,
  parseBoolean,
  parseEnum,
  parseOptionalPositiveInt,
  parseOptionalTrimmedString,
  parsePositiveInt,
  parseTrimmedString,
  type ParseResult,
} from "../../shared/parse.js";

function parseBodyRecord(body: unknown, error = "Invalid request body"): ParseResult<Record<string, unknown>> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail(error);
  }
  return ok(body as Record<string, unknown>);
}

export function parseProjectIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "projectId");
  return parsed.ok ? parsed : fail("Invalid project ID");
}

export function parsePostIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "postId");
  return parsed.ok ? parsed : fail("Invalid post ID");
}

export function parseReportIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "reportId");
  return parsed.ok ? parsed : fail("Invalid report ID");
}

export function parseUserIdQuery(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "userId");
  return parsed.ok ? parsed : fail("Invalid user ID");
}

export function parseProjectUserQuery(req: { params: { projectId?: unknown }; query: { userId?: unknown } }): ParseResult<{
  userId: number;
  projectId: number;
}> {
  const userId = parseUserIdQuery(req.query.userId);
  const projectId = parseProjectIdParam(req.params.projectId);
  if (!userId.ok || !projectId.ok) {
    return fail("Invalid user ID or project ID");
  }
  return ok({ userId: userId.value, projectId: projectId.value });
}

export function parseProjectUserPostQuery(req: {
  params: { projectId?: unknown; postId?: unknown };
  query: { userId?: unknown };
}): ParseResult<{ userId: number; projectId: number; postId: number }> {
  const userId = parseUserIdQuery(req.query.userId);
  const projectId = parseProjectIdParam(req.params.projectId);
  const postId = parsePostIdParam(req.params.postId);
  if (!userId.ok || !projectId.ok || !postId.ok) {
    return fail("Invalid user ID, project ID, or post ID");
  }
  return ok({ userId: userId.value, projectId: projectId.value, postId: postId.value });
}

export function parseCreateDiscussionPostBody(body: unknown): ParseResult<{
  userId: number;
  title: string;
  body: string;
  parentPostId: number | null;
}> {
  const parsedBody = parseBodyRecord(body);
  if (!parsedBody.ok) return parsedBody;

  const userId = parsePositiveInt(parsedBody.value.userId, "userId");
  if (!userId.ok) return fail("Invalid user ID");

  const parentPostId = parseOptionalPositiveInt(parsedBody.value.parentPostId, "parentPostId");
  if (!parentPostId.ok) return fail("Invalid parent post ID");

  const postBody = parseTrimmedString(parsedBody.value.body, "body");
  if (!postBody.ok) return fail("Body is required");

  const rawTitle = parsedBody.value.title;
  const title = parseOptionalTrimmedString(rawTitle, "title");
  if (!title.ok) return fail("Title and body are required");

  if (parentPostId.value === undefined && title.value === undefined) {
    return fail("Title and body are required");
  }

  return ok({
    userId: userId.value,
    title: title.value ?? "",
    body: postBody.value,
    parentPostId: parentPostId.value ?? null,
  });
}

export function parseUpdateDiscussionPostBody(body: unknown, parentPostId: number | null = null): ParseResult<{
  userId: number;
  title: string;
  body: string;
}> {
  const parsedBody = parseBodyRecord(body);
  if (!parsedBody.ok) return parsedBody;

  const userId = parsePositiveInt(parsedBody.value.userId, "userId");
  if (!userId.ok) return fail("Invalid user ID");

  const postBody = parseTrimmedString(parsedBody.value.body, "body");
  if (!postBody.ok) return fail("Body is required");

  // For root posts, title is required
  // For replies, title is optional
  if (parentPostId === null) {
    const title = parseTrimmedString(parsedBody.value.title, "title");
    if (!title.ok) return fail("Title and body are required");
    return ok({ userId: userId.value, title: title.value, body: postBody.value });
  }

  // For replies, allow empty title (optional)
  if (typeof parsedBody.value.title !== "string") {
    return ok({ userId: userId.value, title: "", body: postBody.value });
  }
  return ok({ userId: userId.value, title: parsedBody.value.title.trim(), body: postBody.value });
}

export function parseForumSettingsBody(body: unknown): ParseResult<{ userId: number; forumIsAnonymous: boolean }> {
  const parsedBody = parseBodyRecord(body);
  if (!parsedBody.ok) return parsedBody;

  const userId = parsePositiveInt(parsedBody.value.userId, "userId");
  if (!userId.ok) return fail("Invalid user ID");

  const forumIsAnonymous = parseBoolean(parsedBody.value.forumIsAnonymous, "forumIsAnonymous");
  if (!forumIsAnonymous.ok) return fail("forumIsAnonymous must be boolean");

  return ok({ userId: userId.value, forumIsAnonymous: forumIsAnonymous.value });
}

export function parseProjectPostUserBody(req: {
  params: { projectId?: unknown; postId?: unknown };
  body: unknown;
}): ParseResult<{ projectId: number; postId: number; userId: number; reason?: string }> {
  const projectId = parseProjectIdParam(req.params.projectId);
  const postId = parsePostIdParam(req.params.postId);
  if (!projectId.ok || !postId.ok) {
    return fail("Invalid project ID or post ID");
  }

  const parsedBody = parseBodyRecord(req.body);
  if (!parsedBody.ok) return parsedBody;

  const userId = parsePositiveInt(parsedBody.value.userId, "userId");
  if (!userId.ok) return fail("Invalid user ID");

  const reason = parseOptionalTrimmedString(parsedBody.value.reason, "reason");
  if (!reason.ok) return fail("Invalid reason");

  return ok({
    projectId: projectId.value,
    postId: postId.value,
    userId: userId.value,
    ...(reason.value !== undefined ? { reason: reason.value } : {}),
  });
}

export function parseReactToDiscussionPostBody(req: {
  params: { projectId?: unknown; postId?: unknown };
  body: unknown;
}): ParseResult<{ projectId: number; postId: number; userId: number; type: "LIKE" | "DISLIKE" }> {
  const projectId = parseProjectIdParam(req.params.projectId);
  const postId = parsePostIdParam(req.params.postId);
  if (!projectId.ok || !postId.ok) {
    return fail("Invalid project ID or post ID");
  }

  const parsedBody = parseBodyRecord(req.body);
  if (!parsedBody.ok) return parsedBody;

  const userId = parsePositiveInt(parsedBody.value.userId, "userId");
  if (!userId.ok) return fail("Invalid user ID");

  const type = parseEnum(parsedBody.value.type, "type", ["LIKE", "DISLIKE"] as const);
  if (!type.ok) return fail("Invalid reaction type");

  return ok({ projectId: projectId.value, postId: postId.value, userId: userId.value, type: type.value });
}

export function parseProjectReportUserBody(req: {
  params: { projectId?: unknown; reportId?: unknown };
  body: unknown;
}): ParseResult<{ projectId: number; reportId: number; userId: number }> {
  const projectId = parseProjectIdParam(req.params.projectId);
  const reportId = parseReportIdParam(req.params.reportId);
  if (!projectId.ok || !reportId.ok) {
    return fail("Invalid project ID or report ID");
  }

  const parsedBody = parseBodyRecord(req.body);
  if (!parsedBody.ok) return parsedBody;

  const userId = parsePositiveInt(parsedBody.value.userId, "userId");
  if (!userId.ok) return fail("Invalid user ID");

  return ok({ projectId: projectId.value, reportId: reportId.value, userId: userId.value });
}
