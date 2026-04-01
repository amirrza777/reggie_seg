import { describe, expect, it } from "vitest";
import { parseModuleIdParam, parseModuleJoinCodeBody, parseNormalizedModuleJoinCode } from "./controller.parsers.js";

describe("moduleJoin controller parsers", () => {
  it("parses join body code", () => {
    expect(parseModuleJoinCodeBody({ code: " ABCD2345 " })).toEqual({
      ok: true,
      value: { code: "ABCD2345" },
    });
  });

  it("validates body code and module id", () => {
    expect(parseModuleJoinCodeBody({})).toEqual({
      ok: false,
      error: "code is required",
    });

    expect(parseModuleIdParam("12")).toEqual({ ok: true, value: 12 });
    expect(parseModuleIdParam("0")).toEqual({
      ok: false,
      error: "moduleId must be a positive integer",
    });

    expect(parseNormalizedModuleJoinCode("ABCD-2345")).toEqual({
      ok: true,
      value: "ABCD2345",
    });
    expect(parseNormalizedModuleJoinCode("BAD")).toEqual({
      ok: false,
      error: "code must be a valid module join code",
    });
  });
});
