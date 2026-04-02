function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

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

type NamedMember = { id: number; firstName: string; lastName: string };

export function resolveMentionedMembers<T extends NamedMember>(
  mentionedNames: string[],
  members: T[],
  authorId: number,
): T[] {
  const membersByName = new Map<string, T[]>();
  for (const member of members) {
    const key = normalizeName(`${member.firstName} ${member.lastName}`);
    const group = membersByName.get(key) ?? [];
    group.push(member);
    membersByName.set(key, group);
  }

  const resolved = new Map<number, T>();
  for (const name of mentionedNames) {
    const matched = (membersByName.get(normalizeName(name)) ?? []).filter((m) => m.id !== authorId);
    if (matched.length === 1) resolved.set(matched[0].id, matched[0]);
  }

  return [...resolved.values()];
}
