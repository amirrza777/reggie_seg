import { describe, expect, it } from "vitest";
import {
  parseBoolean,
  parseEnum,
  parseIsoDate,
  parseOptionalIsoDate,
  parseOptionalPositiveInt,
  parsePositiveInt,
  parseTrimmedString,
} from "./parse.js";

describe("shared parse primitives", () => {
  it("parses positive integers", () => {
    expect(parsePositiveInt("12", "id")).toEqual({ ok: true, value: 12 });
    expect(parsePositiveInt("0", "id")).toEqual({ ok: false, error: "id must be a positive integer" });
  });

  it("parses optional positive integers", () => {
    expect(parseOptionalPositiveInt(undefined, "id")).toEqual({ ok: true, value: undefined });
    expect(parseOptionalPositiveInt("7", "id")).toEqual({ ok: true, value: 7 });
  });

  it("parses booleans and enums", () => {
    expect(parseBoolean(true, "active")).toEqual({ ok: true, value: true });
    expect(parseEnum("mcf", "deadlineProfile", ["STANDARD", "MCF"] as const)).toEqual({ ok: true, value: "MCF" });
  });

  it("trims bounded strings", () => {
    expect(parseTrimmedString("  hello  ", "name", { maxLength: 10 })).toEqual({ ok: true, value: "hello" });
    expect(parseTrimmedString("   ", "name")).toEqual({ ok: false, error: "name is required" });
  });

  it("parses required and optional iso dates", () => {
    expect(parseIsoDate("2026-03-24T10:00:00.000Z", "deadline").ok).toBe(true);
    expect(parseOptionalIsoDate(null, "deadline")).toEqual({ ok: true, value: null });
    expect(parseOptionalIsoDate("bad-date", "deadline")).toEqual({
      ok: false,
      error: "deadline must be a valid date string",
    });
  });
});
