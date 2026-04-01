import { describe, it, expect, vi, beforeEach } from "vitest";

const setModeMock = vi.fn(() => ({ toggleDirectionless: vi.fn() }));
const setTextContentMock = vi.fn();
const setFormatMock = vi.fn();
const setDetailMock = vi.fn();
const setStyleMock = vi.fn();

vi.mock("lexical", () => {
  class MockTextNode {
    __text: string;
    __key: string | undefined;
    __mode: number;

    constructor(text: string, key?: string) {
      this.__text = text;
      this.__key = key;
      this.__mode = 0;
    }

    createDOM() {
      const el = document.createElement("span");
      el.textContent = this.__text;
      return el;
    }

    exportJSON() {
      return {
        type: "text",
        text: this.__text,
        format: 0,
        detail: 0,
        mode: "normal",
        style: "",
        version: 1,
      };
    }

    setMode(mode: string) {
      setModeMock(mode);
      return { toggleDirectionless: vi.fn() };
    }

    setTextContent(text: string) {
      this.__text = text;
      setTextContentMock(text);
    }

    setFormat(format: number) {
      setFormatMock(format);
    }

    setDetail(detail: number) {
      setDetailMock(detail);
    }

    setStyle(style: string) {
      setStyleMock(style);
    }
  }

  return {
    TextNode: MockTextNode,
    $applyNodeReplacement: (node: unknown) => node,
  };
});

import { MentionNode, $createMentionNode } from "./MentionNode";

beforeEach(() => {
  setModeMock.mockClear();
  setTextContentMock.mockClear();
  setFormatMock.mockClear();
  setDetailMock.mockClear();
  setStyleMock.mockClear();
});

describe("MentionNode", () => {
  it("returns mention as the node type", () => {
    expect(MentionNode.getType()).toBe("mention");
  });

  it("stores the mention name", () => {
    const node = new MentionNode("Reggie King");
    expect(node.__mention).toBe("Reggie King");
  });

  it("defaults text to @mentionName when no text provided", () => {
    const node = new MentionNode("Reggie King");
    expect(node.__text).toBe("@Reggie King");
  });

  it("uses provided text when given", () => {
    const node = new MentionNode("Reggie King", "@Reggie");
    expect(node.__text).toBe("@Reggie");
  });

  it("clones a node preserving mention and text", () => {
    const original = new MentionNode("Alex Smith", "@Alex");
    const cloned = MentionNode.clone(original);

    expect(cloned.__mention).toBe("Alex Smith");
    expect(cloned.__text).toBe("@Alex");
  });

  it("creates a DOM element with mention-node class and spellcheck disabled", () => {
    const node = new MentionNode("Reggie King");
    const el = node.createDOM({} as any);

    expect(el.className).toBe("mention-node");
    expect(el.spellcheck).toBe(false);
  });

  it("exports DOM with span, mention-node class, and data attribute", () => {
    const node = new MentionNode("Reggie King");
    const { element } = node.exportDOM();

    expect(element?.tagName).toBe("SPAN");
    expect(element?.className).toBe("mention-node");
    expect(element?.textContent).toBe("@Reggie King");
    expect(element?.getAttribute("data-lexical-mention")).toBe("true");
  });

  it("exports JSON with mentionName and mention type", () => {
    const node = new MentionNode("Reggie King");
    const json = node.exportJSON();

    expect(json.mentionName).toBe("Reggie King");
    expect(json.type).toBe("mention");
  });

  it("imports JSON and restores node properties", () => {
    const serialized = {
      mentionName: "Reggie King",
      type: "mention" as const,
      text: "@Reggie King",
      format: 1,
      detail: 2,
      mode: "segmented" as const,
      style: "bold",
      version: 1,
    };

    const node = MentionNode.importJSON(serialized);

    expect(node.__mention).toBe("Reggie King");
    expect(setTextContentMock).toHaveBeenCalledWith("@Reggie King");
    expect(setFormatMock).toHaveBeenCalledWith(1);
    expect(setDetailMock).toHaveBeenCalledWith(2);
    expect(setStyleMock).toHaveBeenCalledWith("bold");
  });

  it("cannot insert text before", () => {
    const node = new MentionNode("Reggie King");
    expect(node.canInsertTextBefore()).toBe(false);
  });

  it("cannot insert text after", () => {
    const node = new MentionNode("Reggie King");
    expect(node.canInsertTextAfter()).toBe(false);
  });

  it("is a text entity", () => {
    const node = new MentionNode("Reggie King");
    expect(node.isTextEntity()).toBe(true);
  });
});

describe("$createMentionNode", () => {
  it("creates a mention node with the given name", () => {
    const node = $createMentionNode("Alex Smith");

    expect(node.__mention).toBe("Alex Smith");
    expect(node.__text).toBe("@Alex Smith");
  });

  it("sets mode to segmented", () => {
    $createMentionNode("Reggie King");

    expect(setModeMock).toHaveBeenCalledWith("segmented");
  });
});
