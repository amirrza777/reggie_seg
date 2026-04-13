import {
  fail,
  ok,
  parseBoolean,
  parseOptionalPositiveInt,
  parseOptionalTrimmedString,
  parsePositiveInt,
  parseTrimmedString,
  type ParseResult,
} from "../../../shared/parse.js";

function parseBodyRecord(body: unknown, error = "Invalid request body"): ParseResult<Record<string, unknown>> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail(error);
  }
  return ok(body as Record<string, unknown>);
}

export function parseLinkIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "linkId");
  return parsed.ok ? parsed : fail("linkId must be a number");
}

export function parseSnapshotIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "snapshotId");
  return parsed.ok ? parsed : fail("snapshotId must be a number");
}

export function parseProjectIdQuery(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "projectId");
  return parsed.ok ? parsed : fail("projectId query param must be a number");
}

export function parseBranchCommitsQuery(query: unknown): ParseResult<{ branch: string; limit: number }> {
  const q = query && typeof query === "object" ? (query as Record<string, unknown>) : {};
  const branch = parseTrimmedString(q.branch, "branch");
  if (!branch.ok) return fail("branch query param is required");
  const limit = parseOptionalPositiveInt(q.limit, "limit");
  if (!limit.ok) return fail("limit query param must be a number");
  return ok({ branch: branch.value, limit: limit.value ?? 10 });
}

export function parseMyCommitsQuery(query: unknown): ParseResult<{ page: number; perPage: number; includeTotals: boolean }> {
  const q = query && typeof query === "object" ? (query as Record<string, unknown>) : {};
  const page = parseOptionalPositiveInt(q.page, "page");
  const perPage = parseOptionalPositiveInt(q.perPage, "perPage");
  if (!page.ok || !perPage.ok) return fail("page and perPage query params must be numbers");
  return ok({
    page: page.value ?? 1,
    perPage: perPage.value ?? 10,
    includeTotals: q.includeTotals === "false" ? false : true,
  });
}

export function parseSyncSettingsBody(body: unknown): ParseResult<{ autoSyncEnabled: boolean; syncIntervalMinutes: number }> {
  const parsedBody = parseBodyRecord(body);
  if (!parsedBody.ok) return parsedBody;
  const autoSyncEnabled = parseBoolean(parsedBody.value.autoSyncEnabled, "autoSyncEnabled");
  if (!autoSyncEnabled.ok) return fail("autoSyncEnabled must be a boolean");
  const syncIntervalMinutes = parsePositiveInt(parsedBody.value.syncIntervalMinutes, "syncIntervalMinutes");
  if (!syncIntervalMinutes.ok) return fail("syncIntervalMinutes must be a number");
  return ok({ autoSyncEnabled: autoSyncEnabled.value, syncIntervalMinutes: syncIntervalMinutes.value });
}

export function parseGithubRepoLinkBody(body: unknown): ParseResult<{
  projectId: number;
  githubRepoId: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  isPrivate: boolean;
  ownerLogin: string;
  defaultBranch: string | null;
}> {
  const parsedBody = parseBodyRecord(body);
  if (!parsedBody.ok) return parsedBody;

  const projectId = parsePositiveInt(parsedBody.value.projectId, "projectId");
  if (!projectId.ok) return fail("projectId must be a number");
  const githubRepoId = parsePositiveInt(parsedBody.value.githubRepoId, "githubRepoId");
  if (!githubRepoId.ok) return fail("githubRepoId must be a number");
  const name = parseTrimmedString(parsedBody.value.name, "name");
  if (!name.ok) return fail("name is required and must be a string");
  const fullName = parseTrimmedString(parsedBody.value.fullName, "fullName");
  if (!fullName.ok) return fail("fullName is required and must be a string");
  const htmlUrl = parseTrimmedString(parsedBody.value.htmlUrl, "htmlUrl");
  if (!htmlUrl.ok) return fail("htmlUrl is required and must be a string");
  const isPrivate = parseBoolean(parsedBody.value.isPrivate, "isPrivate");
  if (!isPrivate.ok) return fail("isPrivate must be a boolean");
  const ownerLogin = parseTrimmedString(parsedBody.value.ownerLogin, "ownerLogin");
  if (!ownerLogin.ok) return fail("ownerLogin is required and must be a string");
  const defaultBranch = parseOptionalTrimmedString(parsedBody.value.defaultBranch, "defaultBranch");
  if (!defaultBranch.ok && parsedBody.value.defaultBranch !== null) return fail("defaultBranch must be a string or null");

  return ok({
    projectId: projectId.value,
    githubRepoId: githubRepoId.value,
    name: name.value,
    fullName: fullName.value,
    htmlUrl: htmlUrl.value,
    isPrivate: isPrivate.value,
    ownerLogin: ownerLogin.value,
    defaultBranch: parsedBody.value.defaultBranch === null ? null : defaultBranch.value ?? null,
  });
}

export function parseGithubConnectReturnTo(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function parseGithubCallbackQuery(query: unknown): ParseResult<{ code: string; state: string }> {
  const q = query && typeof query === "object" ? (query as Record<string, unknown>) : {};
  const code = parseTrimmedString(q.code, "code");
  const state = parseTrimmedString(q.state, "state");
  if (!code.ok || !state.ok) {
    return fail("code and state are required");
  }
  return ok({ code: code.value, state: state.value });
}
