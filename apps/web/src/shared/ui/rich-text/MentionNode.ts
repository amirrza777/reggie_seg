import {
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
  TextNode,
  $applyNodeReplacement,
} from "lexical";

export type SerializedMentionNode = Spread<
  { mentionName: string; type: "mention" },
  SerializedTextNode
>;

export class MentionNode extends TextNode {
  __mention: string;

  static getType(): string {
    return "mention";
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__mention, node.__text, node.__key);
  }

  constructor(mentionName: string, text?: string, key?: NodeKey) {
    super(text ?? `@${mentionName}`, key);
    this.__mention = mentionName;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const el = super.createDOM(config);
    el.className = "mention-node";
    el.spellcheck = false;
    return el;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-lexical-mention")) {
          return null;
        }

        return {
          conversion: (node: HTMLElement): DOMConversionOutput => {
            const text = node.textContent ?? "";
            const mentionName = text.startsWith("@") ? text.slice(1) : text;
            return { node: new MentionNode(mentionName, text) };
          },
          priority: 1,
        };
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const el = document.createElement("span");
    el.className = "mention-node";
    el.textContent = this.__text;
    el.setAttribute("data-lexical-mention", "true");
    return { element: el };
  }

  exportJSON(): SerializedMentionNode {
    return {
      ...super.exportJSON(),
      mentionName: this.__mention,
      type: "mention",
    };
  }

  static importJSON(serializedNode: SerializedMentionNode): MentionNode {
    const node = $createMentionNode(serializedNode.mentionName);
    node.setTextContent(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  isTextEntity(): true {
    return true;
  }
}

export function $createMentionNode(mentionName: string): MentionNode {
  const node = new MentionNode(mentionName);
  node.setMode("segmented").toggleDirectionless();
  return $applyNodeReplacement(node);
}
