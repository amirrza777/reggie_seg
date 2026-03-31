type LexicalNode = {
  type?: string;
  mentionName?: string;
  children?: LexicalNode[];
};

export function extractMentionsFromLexicalJSON(body: string): string[] {
  try {
    const { root } = JSON.parse(body) as { root: LexicalNode };
    const names: string[] = [];

    function walk(node: LexicalNode) {
      if (node.type === "mention" && node.mentionName) names.push(node.mentionName);
      node.children?.forEach(walk);
    }

    walk(root);
    return [...new Set(names)];
  } catch {
    return [];
  }
}
