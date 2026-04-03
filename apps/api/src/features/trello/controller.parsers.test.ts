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
  it("parses callback URL query", () => {
    expect(parseCallbackUrlQuery("https://app.test/projects/1/trello/callback")).toEqual({
      ok: true,
      value: "https://app.test/projects/1/trello/callback",
    });
    expect(parseCallbackUrlQuery(" ")).toEqual({
      ok: false,
      error: "callbackUrl query is required (e.g. app origin + /projects/:projectId/trello/callback)",
    });
    expect(parseCallbackUrlQuery("/relative")).toEqual({
      ok: false,
      error: "callbackUrl query is required (e.g. app origin + /projects/:projectId/trello/callback)",
    });
  });

  it("parses callback body variants", () => {
    expect(parseTrelloCallbackBody({ token: "abc" })).toEqual({ ok: true, value: { token: "abc" } });
    expect(parseTrelloCallbackBody({})).toEqual({ ok: true, value: { token: "" } });
    expect(parseTrelloCallbackBody(null)).toEqual({ ok: true, value: { token: "" } });
  });

  it("parses link-token callback body", () => {
    expect(parseLinkTokenCallbackBody({ linkToken: "jwt", token: "trello" })).toEqual({
      ok: true,
      value: { linkToken: "jwt", token: "trello" },
    });
    expect(parseLinkTokenCallbackBody({ linkToken: "jwt" })).toEqual({
      ok: false,
      error: "Missing linkToken or token",
    });
    expect(parseLinkTokenCallbackBody([])).toEqual({
      ok: false,
      error: "Missing linkToken or token",
    });
  });

  it("parses assign board payload", () => {
    expect(parseAssignBoardBody({ teamId: "3", boardId: "board-1" })).toEqual({
      ok: true,
      value: { teamId: 3, boardId: "board-1" },
    });
    expect(parseAssignBoardBody({ teamId: 0, boardId: "" })).toEqual({
      ok: false,
      error: "Missing teamId or boardId",
    });
  });

  it("parses teamId query", () => {
    expect(parseTeamIdQuery("9")).toEqual({ ok: true, value: 9 });
    expect(parseTeamIdQuery(undefined)).toEqual({ ok: false, error: "Missing teamId" });
  });

  it("parses section config payload", () => {
    expect(parseSectionConfigBody({ teamId: "2", config: { Todo: "todo" } })).toEqual({
      ok: true,
      value: { teamId: 2, config: { Todo: "todo" } },
    });
    expect(parseSectionConfigBody({ teamId: "2", config: [] })).toEqual({
      ok: false,
      error: "Missing or invalid teamId and config (object)",
    });
    expect(parseSectionConfigBody("x")).toEqual({
      ok: false,
      error: "Missing or invalid teamId and config (object)",
    });
  });

  it("parses board id param", () => {
    expect(parseBoardIdParam("abc")).toBe("abc");
    expect(parseBoardIdParam(123)).toBe("");
  });
});
