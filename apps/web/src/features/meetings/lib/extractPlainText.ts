type LexicalNode = {
  text?: string;
  type?: string;
  children?: LexicalNode[];
};

export function extractPlainText(json: string): string {
  try {
    const { root } = JSON.parse(json) as { root: LexicalNode };
    const parts: string[] = [];

    function walk(node: LexicalNode) {
      if (typeof node.text === "string") {
        parts.push(node.text);
        return;
      }
      if (Array.isArray(node.children)) {
        node.children.forEach(walk);
        if (node.type === "paragraph" || node.type === "heading") {
          parts.push("\n");
        }
      }
    }

    walk(root);
    return parts.join("").trim();
  } catch {
    return json;
  }
}
