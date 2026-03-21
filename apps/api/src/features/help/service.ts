export type HelpSearchScope = "overview" | "faqs";

export type HelpSearchRecord = {
  id: string;
  title?: string;
  description?: string;
  group?: string;
  kind?: string;
  href?: string;
  question?: string;
  answer?: string;
  groupId?: string;
  links?: Array<{ label?: string; href?: string }>;
};

type HelpSearchPayload = {
  q: string;
  scope: HelpSearchScope;
  records: HelpSearchRecord[];
  limit: number;
};

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const MAX_QUERY_LENGTH = 120;
const MAX_RECORDS = 500;
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 24;

function parseString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseScope(value: unknown): HelpSearchScope | null {
  if (value === "overview" || value === "faqs") return value;
  return null;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenizeQuery(value: string): string[] {
  return normalize(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function parseRecord(value: unknown): ParseResult<HelpSearchRecord> {
  if (!value || typeof value !== "object") return { ok: false, error: "Each record must be an object" };
  const input = value as Record<string, unknown>;
  const id = parseString(input.id)?.trim();
  if (!id) return { ok: false, error: "Each record must include a non-empty id" };

  const links = Array.isArray(input.links)
    ? input.links
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const candidate = entry as Record<string, unknown>;
          const label = parseString(candidate.label)?.trim() || undefined;
          const href = parseString(candidate.href)?.trim() || undefined;
          if (!label && !href) return null;
          const link: { label?: string; href?: string } = {};
          if (label) link.label = label;
          if (href) link.href = href;
          return link;
        })
        .filter((entry): entry is { label?: string; href?: string } => entry !== null)
    : undefined;

  const title = parseString(input.title) ?? undefined;
  const description = parseString(input.description) ?? undefined;
  const group = parseString(input.group) ?? undefined;
  const kind = parseString(input.kind) ?? undefined;
  const href = parseString(input.href) ?? undefined;
  const question = parseString(input.question) ?? undefined;
  const answer = parseString(input.answer) ?? undefined;
  const groupId = parseString(input.groupId) ?? undefined;

  return {
    ok: true,
    value: {
      id,
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(group !== undefined ? { group } : {}),
      ...(kind !== undefined ? { kind } : {}),
      ...(href !== undefined ? { href } : {}),
      ...(question !== undefined ? { question } : {}),
      ...(answer !== undefined ? { answer } : {}),
      ...(groupId !== undefined ? { groupId } : {}),
      ...(links ? { links } : {}),
    },
  };
}

function parseLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

export function parseHelpSearchPayload(body: unknown): ParseResult<HelpSearchPayload> {
  if (!body || typeof body !== "object") return { ok: false, error: "Payload must be an object" };
  const input = body as Record<string, unknown>;

  const q = parseString(input.q)?.trim() ?? "";
  if (!q) return { ok: false, error: "q is required" };
  if (q.length > MAX_QUERY_LENGTH) {
    return { ok: false, error: `q must be ${MAX_QUERY_LENGTH} characters or fewer` };
  }

  const scope = parseScope(input.scope);
  if (!scope) return { ok: false, error: "scope must be one of: overview, faqs" };

  if (!Array.isArray(input.records)) return { ok: false, error: "records must be an array" };
  if (input.records.length > MAX_RECORDS) {
    return { ok: false, error: `records must contain ${MAX_RECORDS} items or fewer` };
  }

  const records: HelpSearchRecord[] = [];
  for (const record of input.records) {
    const parsedRecord = parseRecord(record);
    if (!parsedRecord.ok) return parsedRecord;
    records.push(parsedRecord.value);
  }

  return {
    ok: true,
    value: {
      q,
      scope,
      records,
      limit: parseLimit(input.limit),
    },
  };
}

function buildSearchText(record: HelpSearchRecord, scope: HelpSearchScope): string {
  if (scope === "overview") {
    return normalize(
      [record.title, record.description, record.group, record.kind, record.href]
        .filter((value) => typeof value === "string" && value.length > 0)
        .join(" "),
    );
  }

  const linkText = (record.links ?? [])
    .map((link) => [link.label, link.href].filter(Boolean).join(" "))
    .join(" ");

  return normalize(
    [record.question, record.answer, record.group, record.groupId, linkText]
      .filter((value) => typeof value === "string" && value.length > 0)
      .join(" "),
  );
}

function countTokenHits(haystack: string, tokens: string[]): number {
  let hits = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) hits += 1;
  }
  return hits;
}

export function searchHelpRecords(payload: HelpSearchPayload): HelpSearchRecord[] {
  const tokens = tokenizeQuery(payload.q);
  if (tokens.length === 0) return [];

  const ranked = payload.records
    .map((record, index) => {
      const text = buildSearchText(record, payload.scope);
      const matchedAllTokens = tokens.every((token) => text.includes(token));
      if (!matchedAllTokens) return null;
      return {
        record,
        index,
        score: countTokenHits(text, tokens),
      };
    })
    .filter((entry): entry is { record: HelpSearchRecord; index: number; score: number } => Boolean(entry))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.index - right.index;
    });

  return ranked.slice(0, payload.limit).map((entry) => entry.record);
}
