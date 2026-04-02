import { describe, it, expect } from "vitest";
import { extractMentionsFromLexicalJSON, extractMentionsFromText, resolveMentionedMembers } from "./mentions.js";

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

describe("extractMentionsFromText", () => {
  it("returns empty array when content has no mentions", () => {
    expect(extractMentionsFromText("no mentions here")).toEqual([]);
  });

  it("extracts a single mention", () => {
    expect(extractMentionsFromText("hello @Alice Smith")).toEqual(["Alice Smith"]);
  });

  it("extracts multiple mentions", () => {
    expect(extractMentionsFromText("cc @Alice Smith and @Bob Jones")).toEqual(["Alice Smith", "Bob Jones"]);
  });

  it("supports apostrophes, hyphens, and unicode letters", () => {
    expect(extractMentionsFromText("cc @Anne-Marie O'Neil and @José Álvarez")).toEqual([
      "Anne-Marie O'Neil",
      "José Álvarez",
    ]);
  });

  it("deduplicates repeated mentions", () => {
    expect(extractMentionsFromText("@Alice Smith and @Alice Smith")).toEqual(["Alice Smith"]);
  });
});

const members = [
  { id: 1, firstName: "Reggie", lastName: "King", role: "STUDENT" },
  { id: 2, firstName: "Alex", lastName: "Trebek", role: "STAFF" },
  { id: 3, firstName: "Bob", lastName: "Jones", role: "STUDENT" },
];

describe("resolveMentionedMembers", () => {
  it("matches mentioned names to members", () => {
    const result = resolveMentionedMembers(["Reggie King", "Alex Trebek"], members, 99);
    expect(result.map((m) => m.id)).toEqual([1, 2]);
  });

  it("excludes the author from results", () => {
    const result = resolveMentionedMembers(["Reggie King"], members, 1);
    expect(result).toEqual([]);
  });

  it("is case insensitive", () => {
    const result = resolveMentionedMembers(["reggie king"], members, 99);
    expect(result[0].id).toBe(1);
  });

  it("handles extra whitespace in names", () => {
    const result = resolveMentionedMembers(["Reggie   King"], members, 99);
    expect(result[0].id).toBe(1);
  });

  it("skips ambiguous names when multiple members share a name", () => {
    const dupeMembers = [
      { id: 1, firstName: "Reggie", lastName: "King" },
      { id: 4, firstName: "Reggie", lastName: "King" },
    ];
    const result = resolveMentionedMembers(["Reggie King"], dupeMembers, 99);
    expect(result).toEqual([]);
  });

  it("skips names that do not match any member", () => {
    const result = resolveMentionedMembers(["Unknown Person"], members, 99);
    expect(result).toEqual([]);
  });

  it("deduplicates when the same name is mentioned twice", () => {
    const result = resolveMentionedMembers(["Reggie King", "Reggie King"], members, 99);
    expect(result).toHaveLength(1);
  });

  it("returns empty array when no names are provided", () => {
    const result = resolveMentionedMembers([], members, 99);
    expect(result).toEqual([]);
  });

  it("preserves extra properties on the returned members", () => {
    const result = resolveMentionedMembers(["Alex Trebek"], members, 99);
    expect(result[0].role).toBe("STAFF");
  });
});
