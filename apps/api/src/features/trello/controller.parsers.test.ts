import { describe, expect, it } from "vitest";
import {
  parseAssignBoardBody,
  parseBoardIdParam,
  parseCallbackUrlQuery,
  parseLinkTokenCallbackBody,
  parseSectionConfigBody,
  parseTeamIdQuery,
  parseTrelloCallbackBody,
} from "./controller.parsers.js";

describe("trello controller parsers", () => {
  it("parses callback url query when valid http url", () => {
    expect(parseCallbackUrlQuery("https://app.local/callback")).toEqual({
      ok: true,
      value: "https://app.local/callback",
    });
  });

  it("rejects callback url query when missing or invalid scheme", () => {
    const expected = {
      ok: false,
      error: "callbackUrl query is required (e.g. app origin + /projects/:projectId/trello/callback)",
    };
    expect(parseCallbackUrlQuery("")).toEqual(expected);
    expect(parseCallbackUrlQuery("ftp://example.com")).toEqual(expected);
    expect(parseCallbackUrlQuery(undefined)).toEqual(expected);
  });

  it("parses trello callback token and falls back to empty token for invalid body", () => {
    expect(parseTrelloCallbackBody({ token: "abc" })).toEqual({ ok: true, value: { token: "abc" } });
    expect(parseTrelloCallbackBody({ token: 123 })).toEqual({ ok: true, value: { token: "123" } });
    expect(parseTrelloCallbackBody({})).toEqual({ ok: true, value: { token: "" } });
    expect(parseTrelloCallbackBody(null)).toEqual({ ok: true, value: { token: "" } });
  });

  it("parses link-token callback body and validates required values", () => {
    expect(parseLinkTokenCallbackBody({ linkToken: "lk", token: "tk" })).toEqual({
      ok: true,
      value: { linkToken: "lk", token: "tk" },
    });
    expect(parseLinkTokenCallbackBody({ linkToken: "lk" })).toEqual({
      ok: false,
      error: "Missing linkToken or token",
    });
    expect(parseLinkTokenCallbackBody("bad")).toEqual({
      ok: false,
      error: "Missing linkToken or token",
    });
  });

  it("parses assign board body and validates missing values", () => {
    expect(parseAssignBoardBody({ teamId: "7", boardId: "board-1" })).toEqual({
      ok: true,
      value: { teamId: 7, boardId: "board-1" },
    });
    expect(parseAssignBoardBody({ teamId: 0, boardId: "x" })).toEqual({
      ok: false,
      error: "Missing teamId or boardId",
    });
    expect(parseAssignBoardBody({ teamId: 2 })).toEqual({
      ok: false,
      error: "Missing teamId or boardId",
    });
    expect(parseAssignBoardBody(null)).toEqual({
      ok: false,
      error: "Missing teamId or boardId",
    });
  });

  it("parses team id query and reports missing id", () => {
    expect(parseTeamIdQuery("9")).toEqual({ ok: true, value: 9 });
    expect(parseTeamIdQuery("bad")).toEqual({ ok: false, error: "Missing teamId" });
  });

  it("parses section config body and rejects invalid config types", () => {
    expect(parseSectionConfigBody({ teamId: 3, config: { col: "doing" } })).toEqual({
      ok: true,
      value: { teamId: 3, config: { col: "doing" } },
    });
    expect(parseSectionConfigBody({ teamId: 3, config: [] })).toEqual({
      ok: false,
      error: "Missing or invalid teamId and config (object)",
    });
    expect(parseSectionConfigBody({})).toEqual({
      ok: false,
      error: "Missing or invalid teamId and config (object)",
    });
    expect(parseSectionConfigBody(null)).toEqual({
      ok: false,
      error: "Missing or invalid teamId and config (object)",
    });
  });

  it("parses board id param as string with empty fallback", () => {
    expect(parseBoardIdParam("board-1")).toBe("board-1");
    expect(parseBoardIdParam(7)).toBe("");
  });
});
