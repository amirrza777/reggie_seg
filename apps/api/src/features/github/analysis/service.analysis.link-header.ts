export function parseLastPageFromLinkHeader(linkHeader: string | null | undefined) {
  if (!linkHeader) {
    return null;
  }

  const parts = linkHeader.split(",");
  for (const part of parts) {
    const [rawUrl, rawRel] = part.split(";");
    if (!rawUrl || !rawRel || !rawRel.includes('rel="last"')) {
      continue;
    }

    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl.startsWith("<") || !trimmedUrl.endsWith(">")) {
      continue;
    }

    const href = trimmedUrl.slice(1, -1);
    try {
      const parsed = new URL(href);
      const page = Number(parsed.searchParams.get("page") ?? "");
      if (Number.isFinite(page) && page > 0) {
        return Math.floor(page);
      }
    } catch {
      continue;
    }
  }

  return null;
}
