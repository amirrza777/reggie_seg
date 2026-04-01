import { describe, expect, it } from "vitest";
import {
  createModuleJoinCodeCandidate,
  MODULE_JOIN_CODE_ALPHABET,
  MODULE_JOIN_CODE_LENGTH,
  MODULE_JOIN_CODE_MAX_ATTEMPTS,
  normalizeModuleJoinCode,
} from "./code.js";

describe("moduleJoin code helpers", () => {
  it("exports sane defaults/constants", () => {
    expect(MODULE_JOIN_CODE_ALPHABET.length).toBeGreaterThan(8);
    expect(MODULE_JOIN_CODE_LENGTH).toBeGreaterThan(0);
    expect(MODULE_JOIN_CODE_MAX_ATTEMPTS).toBeGreaterThan(0);
  });

  it("candidate generation respects configured length and alphabet", () => {
    const code = createModuleJoinCodeCandidate();
    expect(code).toHaveLength(MODULE_JOIN_CODE_LENGTH);
    for (const character of code) {
      expect(MODULE_JOIN_CODE_ALPHABET.includes(character)).toBe(true);
    }
  });

  it("normalizes separators/spacing and uppercases values", () => {
    expect(normalizeModuleJoinCode(" abcd-2345 ")).toBe("ABCD2345");
    expect(normalizeModuleJoinCode("ab cd_23-45")).toBe("ABCD2345");
  });

  it("rejects empty/whitespace and boundary wrong lengths", () => {
    expect(normalizeModuleJoinCode("")).toBeNull();
    expect(normalizeModuleJoinCode("   ")).toBeNull();
    expect(normalizeModuleJoinCode("ABC2345")).toBeNull();
    expect(normalizeModuleJoinCode("ABCD23456")).toBeNull();
  });

  it("rejects characters outside the configured alphabet", () => {
    expect(normalizeModuleJoinCode("ABCD1I45")).toBeNull();
    expect(normalizeModuleJoinCode("ABCD0O45")).toBeNull();
  });
});
