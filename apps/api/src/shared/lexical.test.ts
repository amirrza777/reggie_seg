import { describe, expect, it } from "vitest";
import { extractMentionsFromLexicalJSON } from "./lexical.js";

function makeLexical(nodes: object[]) {
  return JSON.stringify({ root: { children: nodes } });
}

describe("extractMentionsFromLexicalJSON", () => {
  it("returns empty array for invalid JSON", () => {
    expect(extractMentionsFromLexicalJSON("not json")).toEqual([]);
  });

  it("returns empty array when no mentions", () => {
    const body = makeLexical([{ type: "text", text: "hello" }]);
    expect(extractMentionsFromLexicalJSON(body)).toEqual([]);
  });

  it("extracts a single mention", () => {
    const body = makeLexical([{ type: "mention", mentionName: "Reggie King" }]);
    expect(extractMentionsFromLexicalJSON(body)).toEqual(["Reggie King"]);
  });

  it("extracts multiple mentions", () => {
    const body = makeLexical([
      { type: "mention", mentionName: "Reggie King" },
      { type: "mention", mentionName: "Alice Smith" },
    ]);
    expect(extractMentionsFromLexicalJSON(body)).toEqual(["Reggie King", "Alice Smith"]);
  });

  it("deduplicates repeated mentions", () => {
    const body = makeLexical([
      { type: "mention", mentionName: "Reggie King" },
      { type: "mention", mentionName: "Reggie King" },
    ]);
    expect(extractMentionsFromLexicalJSON(body)).toEqual(["Reggie King"]);
  });

  it("extracts mentions nested inside paragraphs", () => {
    const body = JSON.stringify({
      root: {
        children: [
          {
            type: "paragraph",
            children: [{ type: "mention", mentionName: "Reggie King" }],
          },
        ],
      },
    });
    expect(extractMentionsFromLexicalJSON(body)).toEqual(["Reggie King"]);
  });
});
