// Request body/query parsers for TrelloController

import {
  fail,
  ok,
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

export function parseCallbackUrlQuery(value: unknown): ParseResult<string> {
  const parsed = parseTrimmedString(value, "callbackUrl");
  if (!parsed.ok || !parsed.value.startsWith("http")) {
    return fail("callbackUrl query is required (e.g. app origin + /projects/:projectId/trello/callback)");
  }
  return ok(parsed.value);
}

export function parseTrelloCallbackBody(body: unknown): ParseResult<{ token: string }> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ok({ token: "" });
  }
  return ok({ token: String((body as Record<string, unknown>).token ?? "") });
}

export function parseLinkTokenCallbackBody(body: unknown): ParseResult<{ linkToken: string; token: string }> {
  const parsedBody = parseBodyRecord(body, "Missing linkToken or token");
  if (!parsedBody.ok) return parsedBody;
  const linkToken = parseTrimmedString(parsedBody.value.linkToken, "linkToken");
  const token = parseTrimmedString(parsedBody.value.token, "token");
  if (!linkToken.ok || !token.ok) return fail("Missing linkToken or token");
  return ok({ linkToken: linkToken.value, token: token.value });
}

export function parseAssignBoardBody(body: unknown): ParseResult<{ teamId: number; boardId: string }> {
  const parsedBody = parseBodyRecord(body, "Missing teamId or boardId");
  if (!parsedBody.ok) return parsedBody;
  const teamId = parsePositiveInt(parsedBody.value.teamId, "teamId");
  const boardId = parseTrimmedString(parsedBody.value.boardId, "boardId");
  if (!teamId.ok || !boardId.ok) return fail("Missing teamId or boardId");
  return ok({ teamId: teamId.value, boardId: boardId.value });
}

export function parseTeamIdQuery(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "teamId");
  return parsed.ok ? parsed : fail("Missing teamId");
}

export function parseSectionConfigBody(body: unknown): ParseResult<{ teamId: number; config: Record<string, unknown> }> {
  const parsedBody = parseBodyRecord(body, "Missing or invalid teamId and config (object)");
  if (!parsedBody.ok) return parsedBody;
  const teamId = parsePositiveInt(parsedBody.value.teamId, "teamId");
  const config = parsedBody.value.config;
  if (!teamId.ok || !config || typeof config !== "object" || Array.isArray(config)) {
    return fail("Missing or invalid teamId and config (object)");
  }
  return ok({ teamId: teamId.value, config: config as Record<string, unknown> });
}

export function parseBoardIdParam(value: unknown): string {
  return typeof value === "string" ? value : "";
}
