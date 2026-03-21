function getAllowedReturnOrigins() {
  const configured = (process.env.APP_BASE_URL || "").trim();
  const defaults = ["http://localhost:3001", "http://127.0.0.1:3001"];
  const candidates = configured ? [configured, ...defaults] : defaults;
  const origins = new Set<string>();
  for (const candidate of candidates) {
    try {
      origins.add(new URL(candidate).origin);
    } catch {
      // ignore malformed env values
    }
  }
  return origins;
}

export function normalizeReturnTo(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//")) {
      return null;
    }
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }
    const allowedOrigins = getAllowedReturnOrigins();
    if (!allowedOrigins.has(parsed.origin)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
