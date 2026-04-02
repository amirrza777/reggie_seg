import { describe, expect, it } from "vitest";
import { parseModuleIdParam, parseModuleJoinCodeBody, parseNormalizedModuleJoinCode } from "./controller.parsers.js";

describe("moduleJoin controller parsers", () => {
  it("parseModuleJoinCodeBody accepts trimmed valid input", () => {
    expect(parseModuleJoinCodeBody({ code: " ABCD2345 " })).toEqual({
      ok: true,
      value: { code: "ABCD2345" },
    });
  });

  it("parseModuleJoinCodeBody rejects non-object/null/non-string/empty code", () => {
    expect(parseModuleJoinCodeBody(null)).toEqual({
      ok: false,
      error: "code is required",
    });
    expect(parseModuleJoinCodeBody("not-object")).toEqual({
      ok: false,
      error: "code is required",
    });
    expect(parseModuleJoinCodeBody({ code: 123 })).toEqual({
      ok: false,
      error: "code is required",
    });
    expect(parseModuleJoinCodeBody({ code: "   " })).toEqual({
      ok: false,
      error: "code is required",
    });
  });

  it("parseModuleIdParam accepts positive integers and rejects invalid forms", () => {
    expect(parseModuleIdParam("12")).toEqual({ ok: true, value: 12 });
    expect(parseModuleIdParam("abc")).toEqual({
      ok: false,
      error: "moduleId must be a positive integer",
    });
    expect(parseModuleIdParam("-5")).toEqual({
      ok: false,
      error: "moduleId must be a positive integer",
    });
    expect(parseModuleIdParam("1.5")).toEqual({
      ok: false,
      error: "moduleId must be a positive integer",
    });
    expect(parseModuleIdParam("0")).toEqual({
      ok: false,
      error: "moduleId must be a positive integer",
    });
  });

  it("parseNormalizedModuleJoinCode normalizes and validates alphabet/length", () => {
    expect(parseNormalizedModuleJoinCode("abcd-2345")).toEqual({
      ok: true,
      value: "ABCD2345",
    });
    expect(parseNormalizedModuleJoinCode("ABCD1I45")).toEqual({
      ok: false,
      error: "code must be a valid module join code",
    });
    expect(parseNormalizedModuleJoinCode("BAD")).toEqual({
      ok: false,
      error: "code must be a valid module join code",
    });
  });
});
