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
const TOKEN_SPLIT_PATTERN = /[^a-z0-9]+/g;

function parseString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseScope(value: unknown): HelpSearchScope | null {
  if (value === "overview" || value === "faqs") return value;
  return null;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeQuery(value: string): string[] {
  return normalize(value)
    .split(TOKEN_SPLIT_PATTERN)
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

function maxTyposForTokenLength(length: number): number {
  if (length <= 2) return 0;
  if (length <= 5) return 1;
  if (length <= 9) return 2;
  return 3;
}

function getSubstitutionCost(leftChar: string, rightChar: string): number {
  if (leftChar === rightChar) return 0;
  return 1;
}

function isWithinEditDistance(left: string, right: string, maxDistance: number): boolean {
  if (left === right) return true;
  if (maxDistance <= 0) return false;

  const leftLength = left.length;
  const rightLength = right.length;
  if (Math.abs(leftLength - rightLength) > maxDistance) return false;

  const previousRow = new Array<number>(rightLength + 1);
  const currentRow = new Array<number>(rightLength + 1);

  for (let column = 0; column <= rightLength; column += 1) {
    previousRow[column] = column;
  }

  for (let row = 1; row <= leftLength; row += 1) {
    currentRow[0] = row;
    let rowMinimum = currentRow[0];

    for (let column = 1; column <= rightLength; column += 1) {
      const substitutionCost = getSubstitutionCost(left[row - 1], right[column - 1]);
      const deletion = previousRow[column] + 1;
      const insertion = currentRow[column - 1] + 1;
      const substitution = previousRow[column - 1] + substitutionCost;
      const distance = Math.min(deletion, insertion, substitution);
      currentRow[column] = distance;
      rowMinimum = Math.min(rowMinimum, distance);
    }

    if (rowMinimum > maxDistance) return false;

    for (let column = 0; column <= rightLength; column += 1) {
      previousRow[column] = currentRow[column];
    }
  }

  return previousRow[rightLength] <= maxDistance;
}

function isOrderedSubsequence(source: string, query: string): boolean {
  if (!query) return true;
  let queryIndex = 0;

  for (let sourceIndex = 0; sourceIndex < source.length && queryIndex < query.length; sourceIndex += 1) {
    if (source[sourceIndex] === query[queryIndex]) {
      queryIndex += 1;
    }
  }

  return queryIndex === query.length;
}

function scoreTokenMatch(searchToken: string, queryToken: string): number {
  if (searchToken.includes(queryToken)) return 4;
  if (queryToken.includes(searchToken) && queryToken.length > 3) return 3;
  if (queryToken.length >= 2 && isOrderedSubsequence(searchToken, queryToken)) return 2;

  const maxDistance = maxTyposForTokenLength(queryToken.length);
  if (isWithinEditDistance(searchToken, queryToken, maxDistance)) return 1;
  return 0;
}

function scoreFuzzyTokenMatches(text: string, queryTokens: string[]): number | null {
  if (queryTokens.length === 0) return 0;

  const searchTokens = Array.from(new Set(tokenizeQuery(text)));
  if (searchTokens.length === 0) return null;

  let score = 0;
  for (const queryToken of queryTokens) {
    let bestMatchScore = 0;
    for (const searchToken of searchTokens) {
      const nextScore = scoreTokenMatch(searchToken, queryToken);
      if (nextScore > bestMatchScore) bestMatchScore = nextScore;
      if (bestMatchScore === 4) break;
    }
    if (bestMatchScore === 0) return null;
    score += bestMatchScore;
  }

  return score;
}

export function searchHelpRecords(payload: HelpSearchPayload): HelpSearchRecord[] {
  const normalizedQuery = normalize(payload.q);
  const tokens = tokenizeQuery(normalizedQuery);
  if (tokens.length === 0) return [];

  const ranked = payload.records
    .map((record, index) => {
      const text = buildSearchText(record, payload.scope);
      const fuzzyScore = scoreFuzzyTokenMatches(text, tokens);
      if (fuzzyScore == null) return null;
      const exactTokenHits = countTokenHits(text, tokens);
      return {
        record,
        index,
        score: exactTokenHits * 10 + fuzzyScore + (text.includes(normalizedQuery) ? 5 : 0),
      };
    })
    .filter((entry): entry is { record: HelpSearchRecord; index: number; score: number } => Boolean(entry))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.index - right.index;
    });

  return ranked.slice(0, payload.limit).map((entry) => entry.record);
}
