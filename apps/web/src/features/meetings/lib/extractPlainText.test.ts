import { extractPlainText } from "./extractPlainText";

function makeLexical(children: object[]) {
  return JSON.stringify({
    root: {
      children: [{ children, type: "paragraph", indent: 0, format: "", direction: null, version: 1, textFormat: 0, textStyle: "" }],
      type: "root",
      indent: 0,
      format: "",
      direction: null,
      version: 1,
    },
  });
}

describe("extractPlainText", () => {
  it("extracts text from a single paragraph", () => {
    const json = makeLexical([{ text: "hello world", type: "text", detail: 0, format: 0, mode: "normal", style: "", version: 1 }]);
    expect(extractPlainText(json)).toBe("hello world");
  });

  it("extracts text from multiple paragraphs", () => {
    const json = JSON.stringify({
      root: {
        children: [
          { children: [{ text: "first", type: "text" }], type: "paragraph" },
          { children: [{ text: "second", type: "text" }], type: "paragraph" },
        ],
        type: "root",
      },
    });
    expect(extractPlainText(json)).toBe("first\nsecond");
  });

  it("extracts text from headings", () => {
    const json = JSON.stringify({
      root: {
        children: [
          { children: [{ text: "Title", type: "text" }], type: "heading" },
          { children: [{ text: "Body", type: "text" }], type: "paragraph" },
        ],
        type: "root",
      },
    });
    expect(extractPlainText(json)).toBe("Title\nBody");
  });

  it("returns the original string for invalid JSON", () => {
    expect(extractPlainText("not json")).toBe("not json");
  });

  it("returns the original string for JSON without root", () => {
    expect(extractPlainText(JSON.stringify({ data: "hello" }))).toBe(JSON.stringify({ data: "hello" }));
  });

  it("returns empty string for empty paragraphs", () => {
    const json = JSON.stringify({
      root: { children: [{ children: [], type: "paragraph" }], type: "root" },
    });
    expect(extractPlainText(json)).toBe("");
  });

  it("concatenates multiple text nodes in a single paragraph", () => {
    const json = makeLexical([
      { text: "hello ", type: "text" },
      { text: "world", type: "text" },
    ]);
    expect(extractPlainText(json)).toBe("hello world");
  });

  it("returns plain text unchanged when passed as non-JSON", () => {
    expect(extractPlainText("plain agenda text")).toBe("plain agenda text");
  });
});
