import { describe, expect, it } from "vitest";
import { parseModuleIdParam, parseModuleJoinCodeBody, parseNormalizedModuleJoinCode } from "./controller.parsers.js";

describe("moduleJoin controller parsers", registerParserTests);

function registerParserTests() {
  it("parseModuleJoinCodeBody accepts trimmed valid input", () => {
    expect(parseModuleJoinCodeBody({ code: " ABCD2345 " })).toEqual({
      ok: true,
      value: { code: "ABCD2345" },
    });
  });

  it("parseModuleJoinCodeBody rejects invalid inputs", () => {
    assertInvalidJoinCodeBody(null);
    assertInvalidJoinCodeBody("not-object");
    assertInvalidJoinCodeBody({ code: 123 });
    assertInvalidJoinCodeBody({ code: "   " });
  });

  it("parseModuleIdParam accepts positive integers and rejects invalid forms", () => {
    expect(parseModuleIdParam("12")).toEqual({ ok: true, value: 12 });
    assertInvalidModuleId("abc");
    assertInvalidModuleId("-5");
    assertInvalidModuleId("1.5");
    assertInvalidModuleId("0");
  });

  it("parseNormalizedModuleJoinCode normalizes and validates alphabet/length", () => {
    expect(parseNormalizedModuleJoinCode("abcd-2345")).toEqual({ ok: true, value: "ABCD2345" });
    assertInvalidNormalizedCode("ABCD1I45");
    assertInvalidNormalizedCode("BAD");
  });
}

function assertInvalidJoinCodeBody(value: unknown) {
  expect(parseModuleJoinCodeBody(value)).toEqual({ ok: false, error: "code is required" });
}

function assertInvalidModuleId(value: unknown) {
  expect(parseModuleIdParam(value)).toEqual({ ok: false, error: "moduleId must be a positive integer" });
}

function assertInvalidNormalizedCode(value: string) {
  expect(parseNormalizedModuleJoinCode(value)).toEqual({ ok: false, error: "code must be a valid module join code" });
}
