import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = {
  MODULE_JOIN_CODE_ALPHABET: process.env.MODULE_JOIN_CODE_ALPHABET,
  MODULE_JOIN_CODE_LENGTH: process.env.MODULE_JOIN_CODE_LENGTH,
  MODULE_JOIN_CODE_MAX_ATTEMPTS: process.env.MODULE_JOIN_CODE_MAX_ATTEMPTS,
};

async function loadCodeWithEnv(overrides: Partial<Record<keyof typeof ORIGINAL_ENV, string | undefined>>) {
  for (const key of Object.keys(ORIGINAL_ENV) as (keyof typeof ORIGINAL_ENV)[]) {
    const value = overrides[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.resetModules();
  return import("./code.js");
}

afterEach(() => {
  for (const key of Object.keys(ORIGINAL_ENV) as (keyof typeof ORIGINAL_ENV)[]) {
    const value = ORIGINAL_ENV[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.resetModules();
});

describe("moduleJoin code env parsing", () => {
  it("uses fallback numeric values for invalid or non-positive inputs", async () => {
    const code = await loadCodeWithEnv({
      MODULE_JOIN_CODE_LENGTH: "abc",
      MODULE_JOIN_CODE_MAX_ATTEMPTS: "0",
    });
    expect(code.MODULE_JOIN_CODE_LENGTH).toBe(8);
    expect(code.MODULE_JOIN_CODE_MAX_ATTEMPTS).toBe(20);
  });

  it("uses configured positive numeric values", async () => {
    const code = await loadCodeWithEnv({
      MODULE_JOIN_CODE_LENGTH: "10",
      MODULE_JOIN_CODE_MAX_ATTEMPTS: "30",
    });
    expect(code.MODULE_JOIN_CODE_LENGTH).toBe(10);
    expect(code.MODULE_JOIN_CODE_MAX_ATTEMPTS).toBe(30);
  });

  it("uses fallback alphabet for too-short or invalid configured alphabet", async () => {
    const shortAlpha = await loadCodeWithEnv({
      MODULE_JOIN_CODE_ALPHABET: "ABCD",
    });
    expect(shortAlpha.MODULE_JOIN_CODE_ALPHABET).toBe("23456789ABCDEFGHJKMNPQRSTVWXYZ");

    const invalidAlpha = await loadCodeWithEnv({
      MODULE_JOIN_CODE_ALPHABET: "ABCDEF*123",
    });
    expect(invalidAlpha.MODULE_JOIN_CODE_ALPHABET).toBe("23456789ABCDEFGHJKMNPQRSTVWXYZ");
  });

  it("sanitizes configured alphabet by trimming, stripping spaces, and deduplicating", async () => {
    const code = await loadCodeWithEnv({
      MODULE_JOIN_CODE_ALPHABET: "  A A B B C C D D 2 3 4 5 6 7 8 9 ",
    });
    expect(code.MODULE_JOIN_CODE_ALPHABET).toBe("ABCD23456789");
  });
});
