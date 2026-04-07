type SearchSelector<T> = (item: T) => unknown;

export type SearchOptions<T> = {
  fields?: Array<keyof T | string>;
  selectors?: SearchSelector<T>[];
  maxDepth?: number;
};

type CollectContext = {
  tokens: string[];
  seen: WeakSet<object>;
  maxDepth: number;
};

type DistanceRows = { previousRow: number[]; currentRow: number[] };

const DEFAULT_MAX_DEPTH = 5;
const TOKEN_SPLIT_PATTERN = /[^a-z0-9]+/g;
export const SEARCH_DEBOUNCE_MS = 250;

export function normalizeSearchQuery(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function resolvePath(input: unknown, path: string): unknown {
  if (!path) {
    return input;
  }
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }
    return (value as Record<string, unknown>)[key];
  }, input);
}

function appendToken(tokens: string[], value: unknown) {
  const token = normalizeSearchQuery(value);
  if (token) {
    tokens.push(token);
  }
}

function isPrimitiveSearchValue(value: unknown): value is string | number | boolean | bigint {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint";
}

function collectObjectTokens(value: object, context: CollectContext, depth: number): void {
  if (context.seen.has(value) || depth >= context.maxDepth) {
    return;
  }
  context.seen.add(value);
  for (const [key, entry] of Object.entries(value)) {
    appendToken(context.tokens, key);
    collectTokens(entry, context, depth + 1);
  }
}

function collectTokens(value: unknown, context: CollectContext, depth: number): void {
  if (value == null) {
    return;
  }
  if (isPrimitiveSearchValue(value)) {
    appendToken(context.tokens, value);
    return;
  }
  if (value instanceof Date) {
    appendToken(context.tokens, value.toISOString());
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectTokens(entry, context, depth + 1);
    }
    return;
  }
  if (typeof value === "object") {
    collectObjectTokens(value, context, depth);
  }
}

function hasConfiguredSources<T>(options: SearchOptions<T>) {
  return Boolean(options.fields?.length || options.selectors?.length);
}

function getConfiguredSources<T>(item: T, options: SearchOptions<T>): unknown[] {
  const values: unknown[] = [];
  for (const field of options.fields ?? []) {
    values.push(resolvePath(item, String(field)));
  }
  for (const selector of options.selectors ?? []) {
    values.push(selector(item));
  }
  return values;
}

function buildSearchText(value: unknown, maxDepth: number): string {
  const context: CollectContext = { tokens: [], seen: new WeakSet<object>(), maxDepth };
  collectTokens(value, context, 0);
  return context.tokens.join(" ");
}

function tokenize(value: string): string[] {
  return value
    .split(TOKEN_SPLIT_PATTERN)
    .map((token) => token.trim())
    .filter(Boolean);
}

function maxTyposForTokenLength(length: number): number {
  if (length <= 2) {
    return 0;
  }
  if (length <= 5) {
    return 1;
  }
  if (length <= 9) {
    return 2;
  }
  return 3;
}

function getSubstitutionCost(leftChar: string, rightChar: string) {
  return leftChar === rightChar ? 0 : 1;
}

function fillDistanceRow(leftChar: string, right: string, row: number, rows: DistanceRows) {
  rows.currentRow[0] = row;
  let rowMinimum = row;
  for (let column = 1; column <= right.length; column += 1) {
    const substitutionCost = getSubstitutionCost(leftChar, right[column - 1] ?? "");
    const deletion = (rows.previousRow[column] ?? Number.POSITIVE_INFINITY) + 1;
    const insertion = (rows.currentRow[column - 1] ?? Number.POSITIVE_INFINITY) + 1;
    const substitution = (rows.previousRow[column - 1] ?? Number.POSITIVE_INFINITY) + substitutionCost;
    const distance = Math.min(deletion, insertion, substitution);
    rows.currentRow[column] = distance;
    rowMinimum = Math.min(rowMinimum, distance);
  }
  return rowMinimum;
}

function copyDistanceRow(previousRow: number[], currentRow: number[], rightLength: number) {
  for (let column = 0; column <= rightLength; column += 1) {
    previousRow[column] = currentRow[column] ?? 0;
  }
}

function isWithinEditDistance(left: string, right: string, maxDistance: number): boolean {
  if (left === right) {
    return true;
  }
  if (maxDistance <= 0) {
    return false;
  }
  if (Math.abs(left.length - right.length) > maxDistance) {
    return false;
  }

  const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);
  const currentRow = new Array<number>(right.length + 1).fill(0);
  const rows = { previousRow, currentRow };
  for (let row = 1; row <= left.length; row += 1) {
    const rowMinimum = fillDistanceRow(left[row - 1] ?? "", right, row, rows);
    if (rowMinimum > maxDistance) {
      return false;
    }
    copyDistanceRow(previousRow, currentRow, right.length);
  }
  return (previousRow[right.length] ?? Number.POSITIVE_INFINITY) <= maxDistance;
}

function isOrderedSubsequence(source: string, query: string): boolean {
  if (!query) {
    return true;
  }
  let queryIndex = 0;
  for (let sourceIndex = 0; sourceIndex < source.length && queryIndex < query.length; sourceIndex += 1) {
    if (source[sourceIndex] === query[queryIndex]) {
      queryIndex += 1;
    }
  }
  return queryIndex === query.length;
}

function hasQueryTokenMatch(searchToken: string, queryToken: string): boolean {
  if (searchToken.includes(queryToken)) {
    return true;
  }
  if (queryToken.includes(searchToken) && queryToken.length > 3) {
    return true;
  }
  if (queryToken.length >= 2 && isOrderedSubsequence(searchToken, queryToken)) {
    return true;
  }
  return isWithinEditDistance(searchToken, queryToken, maxTyposForTokenLength(queryToken.length));
}

function hasFuzzyTokenMatch(searchText: string, normalizedQuery: string): boolean {
  const queryTokens = tokenize(normalizedQuery);
  if (queryTokens.length === 0) {
    return true;
  }
  const searchTokens = Array.from(new Set(tokenize(searchText)));
  if (searchTokens.length === 0) {
    return false;
  }
  return queryTokens.every((queryToken) => searchTokens.some((searchToken) => hasQueryTokenMatch(searchToken, queryToken)));
}

export function matchesSearchQuery<T>(item: T, query: string, options: SearchOptions<T> = {}): boolean {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) {
    return true;
  }
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const sources = hasConfiguredSources(options) ? getConfiguredSources(item, options) : [item];
  const searchText = sources.map((source) => buildSearchText(source, maxDepth)).join(" ");
  if (searchText.includes(normalizedQuery)) {
    return true;
  }
  return hasFuzzyTokenMatch(searchText, normalizedQuery);
}

export function filterBySearchQuery<T>(items: readonly T[], query: string, options: SearchOptions<T> = {}): T[] {
  if (!normalizeSearchQuery(query)) {
    return [...items];
  }
  return items.filter((item) => matchesSearchQuery(item, query, options));
}
