import { describe, expect, it } from "vitest";
import { parseGithubCallbackQuery } from "./controller.parsers.js";

describe("github controller parsers", () => {
  it("parses callback query params", () => {
    expect(parseGithubCallbackQuery({ code: " abc ", state: " signed " })).toEqual({
      ok: true,
      value: { code: "abc", state: "signed" },
    });
  });

  it("requires callback code and state", () => {
    expect(parseGithubCallbackQuery({ code: "abc" })).toEqual({
      ok: false,
      error: "code and state are required",
    });
  });
});
