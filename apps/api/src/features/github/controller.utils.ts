export function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, currentValue) =>
      typeof currentValue === "bigint" ? Number(currentValue) : currentValue
    )
  ) as T;
}

export function withQuery(path: string, params: Record<string, string>) {
  try {
    const absolute = new URL(path);
    for (const [key, value] of Object.entries(params)) {
      absolute.searchParams.set(key, value);
    }
    return absolute.toString();
  } catch {
    const [basePath, existingQuery = ""] = path.split("?", 2);
    const query = new URLSearchParams(existingQuery);
    for (const [key, value] of Object.entries(params)) {
      query.set(key, value);
    }
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }
}
