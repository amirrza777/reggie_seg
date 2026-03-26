import { describe, expect, it } from "vitest";
import {
  parseMarkingBody,
  parseModuleIdParam,
  parseModuleIdQuery,
  parseStaffIdQuery,
  parseStudentIdParam,
  parseTeamIdParam,
} from "./controller.parsers.js";

describe("peerAssessment staff controller parsers", () => {
  it("parses staff and route identifiers", () => {
    expect(parseStaffIdQuery("5")).toEqual({ ok: true, value: 5 });
    expect(parseModuleIdParam("2")).toEqual({ ok: true, value: 2 });
    expect(parseTeamIdParam("3")).toEqual({ ok: true, value: 3 });
    expect(parseStudentIdParam("4")).toEqual({ ok: true, value: 4 });
    expect(parseModuleIdQuery("7")).toEqual({ ok: true, value: 7 });
  });

  it("parses marking payloads", () => {
    expect(parseMarkingBody({ mark: 87.555, formativeFeedback: " Good " })).toEqual({
      ok: true,
      value: { mark: 87.56, formativeFeedback: "Good" },
    });
    expect(parseMarkingBody({ mark: 101 })).toEqual({ ok: false, error: "mark must be between 0 and 100." });
  });
});
