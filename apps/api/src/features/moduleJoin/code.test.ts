import { describe, expect, it } from "vitest";
import { normalizeModuleJoinCode } from "./code.js";

describe("moduleJoin code helpers", () => {
  it("normalizes formatted valid codes", () => {
    expect(normalizeModuleJoinCode("abcd-2345")).toBe("ABCD2345");
  });

  it("rejects characters outside the generator alphabet", () => {
    expect(normalizeModuleJoinCode("ABCD1I45")).toBeNull();
    expect(normalizeModuleJoinCode("ABCD0O45")).toBeNull();
  });

  it("rejects wrong-length values", () => {
    expect(normalizeModuleJoinCode("ABC2345")).toBeNull();
    expect(normalizeModuleJoinCode("ABCD23456")).toBeNull();
  });
});
