import { fail, ok, parsePositiveInt, type ParseResult } from "../../shared/parse.js";

function parseBodyRecord(body: unknown, error = "Invalid request body"): ParseResult<Record<string, unknown>> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail(error);
  }
  return ok(body as Record<string, unknown>);
}

export function parseNotificationUserIdQuery(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "userId");
  return parsed.ok ? parsed : fail("Invalid or missing userId");
}

export function parseNotificationIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "id");
  return parsed.ok ? parsed : fail("Invalid notification ID");
}

export function parseNotificationActionBody(body: unknown): ParseResult<{ userId: number }> {
  const parsedBody = parseBodyRecord(body, "Missing required field: userId");
  if (!parsedBody.ok) return parsedBody;

  const userId = parsePositiveInt(parsedBody.value.userId, "userId");
  if (!userId.ok) return fail("Missing required field: userId");

  return ok({ userId: userId.value });
}
