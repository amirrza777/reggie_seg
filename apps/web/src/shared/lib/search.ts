type SearchSelector<T> = (item: T) => unknown;

export type SearchOptions<T> = {
  fields?: Array<keyof T | string>;
  selectors?: SearchSelector<T>[];
  maxDepth?: number;
};

const DEFAULT_MAX_DEPTH = 5;
const TOKEN_SPLIT_PATTERN = /[^a-z0-9]+/g;

export function normalizeSearchQuery(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function resolvePath(input: unknown, path: string): unknown {
  if (!path) return input;
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, input);
}

function appendToken(tokens: string[], value: unknown) {
  const token = normalizeSearchQuery(value);
  if (token) tokens.push(token);
}

function collectTokens(value: unknown, tokens: string[], seen: WeakSet<object>, depth: number, maxDepth: number): void {
  if (value == null) return;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    appendToken(tokens, value);
    return;
  }

  if (value instanceof Date) {
    appendToken(tokens, value.toISOString());
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectTokens(entry, tokens, seen, depth + 1, maxDepth);
    }
    return;
  }

  if (typeof value === "object") {
    if (seen.has(value)) return;
    seen.add(value);
    if (depth >= maxDepth) return;

    for (const [key, entry] of Object.entries(value)) {
      appendToken(tokens, key);
      collectTokens(entry, tokens, seen, depth + 1, maxDepth);
    }
  }
}

function hasConfiguredSources<T>(options: SearchOptions<T>) {
  return Boolean(options.fields?.length || options.selectors?.length);
}

function getConfiguredSources<T>(item: T, options: SearchOptions<T>): unknown[] {
  const values: unknown[] = [];

  for (const field of options.fields ?? []) {
    const path = String(field);
    values.push(resolvePath(item, path));
  }

  for (const selector of options.selectors ?? []) {
    values.push(selector(item));
  }

  return values;
}

function buildSearchText(value: unknown, maxDepth: number): string {
  const tokens: string[] = [];
  collectTokens(value, tokens, new WeakSet<object>(), 0, maxDepth);
  return tokens.join(" ");
}

function tokenize(value: string): string[] {
  return value
    .split(TOKEN_SPLIT_PATTERN)
    .map((token) => token.trim())
    .filter(Boolean);
}

function maxTyposForTokenLength(length: number): number {
  if (length <= 2) return 0;
  if (length <= 5) return 1;
  if (length <= 9) return 2;
  return 3;
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

function getSubstitutionCost(leftChar: string, rightChar: string) {
  if (leftChar === rightChar) return 0;
  return 1;
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

function hasFuzzyTokenMatch(searchText: string, normalizedQuery: string): boolean {
  const queryTokens = tokenize(normalizedQuery);
  if (queryTokens.length === 0) return true;

  const searchTokens = Array.from(new Set(tokenize(searchText)));
  if (searchTokens.length === 0) return false;

  return queryTokens.every((queryToken) => {
    const maxDistance = maxTyposForTokenLength(queryToken.length);
    return searchTokens.some((searchToken) => {
      if (searchToken.includes(queryToken)) return true;
      if (queryToken.includes(searchToken) && queryToken.length > 3) return true;
      if (queryToken.length >= 2 && isOrderedSubsequence(searchToken, queryToken)) return true;
      return isWithinEditDistance(searchToken, queryToken, maxDistance);
    });
  });
}

export function matchesSearchQuery<T>(item: T, query: string, options: SearchOptions<T> = {}): boolean {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return true;

  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const sources = hasConfiguredSources(options) ? getConfiguredSources(item, options) : [item];
  const searchText = sources.map((source) => buildSearchText(source, maxDepth)).join(" ");

  if (searchText.includes(normalizedQuery)) return true;
  return hasFuzzyTokenMatch(searchText, normalizedQuery);
}

export function filterBySearchQuery<T>(items: readonly T[], query: string, options: SearchOptions<T> = {}): T[] {
  if (!normalizeSearchQuery(query)) return [...items];
  return items.filter((item) => matchesSearchQuery(item, query, options));
}
