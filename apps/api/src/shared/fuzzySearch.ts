const TOKEN_SPLIT_PATTERN = /[^a-z0-9]+/g;

/** Normalizes search input for fuzzy matching. */
export function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Parses a positive integer search query, otherwise returns null. */
export function parsePositiveIntegerSearchQuery(query: string | null | undefined): number | null {
  if (typeof query !== "string") return null;
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return null;

  const numericQuery = Number(trimmedQuery);
  if (!Number.isInteger(numericQuery) || numericQuery <= 0) {
    return null;
  }
  return numericQuery;
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
  if (Math.abs(left.length - right.length) > maxDistance) return false;

  const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);
  const currentRow = new Array<number>(right.length + 1).fill(0);

  for (let row = 1; row <= left.length; row += 1) {
    currentRow[0] = row;
    let rowMinimum = row;

    for (let column = 1; column <= right.length; column += 1) {
      const substitutionCost = Number(left[row - 1] !== right[column - 1]);
      const deletion = (previousRow[column] ?? Number.POSITIVE_INFINITY) + 1;
      const insertion = (currentRow[column - 1] ?? Number.POSITIVE_INFINITY) + 1;
      const substitution = (previousRow[column - 1] ?? Number.POSITIVE_INFINITY) + substitutionCost;
      const distance = Math.min(deletion, insertion, substitution);
      currentRow[column] = distance;
      rowMinimum = Math.min(rowMinimum, distance);
    }

    if (rowMinimum > maxDistance) return false;

    for (let column = 0; column <= right.length; column += 1) {
      previousRow[column] = currentRow[column] ?? 0;
    }
  }

  return (previousRow[right.length] ?? Number.POSITIVE_INFINITY) <= maxDistance;
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

/**
 * Returns true when every query token matches at least one source token
 * through contains, ordered-subsequence, or bounded edit-distance.
 */
export function matchesFuzzySearch(query: string, sources: unknown[]): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const normalizedSources = sources.map((source) => normalizeSearchText(source)).filter(Boolean).join(" ");
  if (!normalizedSources) return false;
  if (normalizedSources.includes(normalizedQuery)) return true;

  const queryTokens = tokenize(normalizedQuery);
  if (queryTokens.length === 0) return true;

  const sourceTokens = Array.from(new Set(tokenize(normalizedSources)));
  if (sourceTokens.length === 0) return false;

  return queryTokens.every((queryToken) => {
    const maxDistance = maxTyposForTokenLength(queryToken.length);
    return sourceTokens.some((sourceToken) => {
      if (sourceToken.includes(queryToken)) return true;
      if (queryToken.includes(sourceToken) && queryToken.length > 3) return true;
      if (queryToken.length >= 2 && isOrderedSubsequence(sourceToken, queryToken)) return true;
      return isWithinEditDistance(sourceToken, queryToken, maxDistance);
    });
  });
}

/** Checks candidate query match with shared fuzzy logic plus optional exact numeric-id match. */
export function matchesFuzzySearchCandidate(options: {
  query: string;
  sources: unknown[];
  candidateId?: number | null;
}): boolean {
  const trimmedQuery = options.query.trim();
  if (!trimmedQuery) return true;

  const numericQuery = parsePositiveIntegerSearchQuery(trimmedQuery);
  if (typeof options.candidateId === "number" && numericQuery !== null && options.candidateId === numericQuery) {
    return true;
  }

  return matchesFuzzySearch(trimmedQuery, options.sources);
}
