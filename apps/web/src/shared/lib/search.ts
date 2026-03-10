type SearchSelector<T> = (item: T) => unknown;

export type SearchOptions<T> = {
  fields?: Array<keyof T | string>;
  selectors?: SearchSelector<T>[];
  maxDepth?: number;
};

const DEFAULT_MAX_DEPTH = 5;

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

export function matchesSearchQuery<T>(item: T, query: string, options: SearchOptions<T> = {}): boolean {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return true;

  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const sources = hasConfiguredSources(options) ? getConfiguredSources(item, options) : [item];
  const searchText = sources.map((source) => buildSearchText(source, maxDepth)).join(" ");

  return searchText.includes(normalizedQuery);
}

export function filterBySearchQuery<T>(items: readonly T[], query: string, options: SearchOptions<T> = {}): T[] {
  if (!normalizeSearchQuery(query)) return [...items];
  return items.filter((item) => matchesSearchQuery(item, query, options));
}
