import { describe, expect, it } from "vitest";
import { parseDismissTeamIdParam } from "./controller.parsers.js";

describe("teams controller parsers", () => {
  it("parses valid team id", () => {
    expect(parseDismissTeamIdParam("7")).toEqual({ ok: true, value: 7 });
  });

  it("rejects invalid team id", () => {
    expect(parseDismissTeamIdParam("bad")).toEqual({ ok: false, error: "Invalid team ID" });
    expect(parseDismissTeamIdParam(0)).toEqual({ ok: false, error: "Invalid team ID" });
  });
});
