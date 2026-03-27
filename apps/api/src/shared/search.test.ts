import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "./search.js";

describe("parseSearchQuery", () => {
  it("returns null when value is undefined", () => {
    expect(parseSearchQuery(undefined)).toEqual({ ok: true, value: null });
  });

  it("returns an error when value is not a string", () => {
    expect(parseSearchQuery(123)).toEqual({ ok: false, error: "q must be a string" });
  });

  it("returns null when string is blank after trimming", () => {
    expect(parseSearchQuery("   ")).toEqual({ ok: true, value: null });
  });

  it("returns an error when query exceeds max length", () => {
    expect(parseSearchQuery("abcdef", { key: "query", maxLength: 3 })).toEqual({
      ok: false,
      error: "query must be 3 characters or fewer",
    });
  });

  it("returns trimmed query when valid", () => {
    expect(parseSearchQuery("  hello world  ")).toEqual({ ok: true, value: "hello world" });
  });
});
