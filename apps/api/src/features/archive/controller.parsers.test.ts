import { describe, expect, it } from "vitest";
import { parseArchiveEntityId } from "./controller.parsers.js";

describe("parseArchiveEntityId", () => {
  it("returns the parsed id for a valid positive integer string", () => {
    const r = parseArchiveEntityId("42");
    expect(r).toEqual({ ok: true, value: 42 });
  });

  it("maps parse failures to Invalid id", () => {
    const r = parseArchiveEntityId("0");
    expect(r).toEqual({ ok: false, error: "Invalid id" });
  });

  it("maps non-numeric values to Invalid id", () => {
    expect(parseArchiveEntityId("abc")).toEqual({ ok: false, error: "Invalid id" });
  });
});
