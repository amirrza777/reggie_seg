export function getEffectiveTotalPages(totalPages: number): number {
  if (!Number.isFinite(totalPages)) return 1;
  return Math.max(1, Math.trunc(totalPages));
}

export function parsePageInput(rawValue: string, totalPages: number): number | null {
  const parsedPage = Number(rawValue);
  const maxPage = getEffectiveTotalPages(totalPages);
  if (!Number.isInteger(parsedPage) || parsedPage < 1 || parsedPage > maxPage) {
    return null;
  }
  return parsedPage;
}

export function getPaginationStart(total: number, page: number, pageSize: number): number {
  if (total === 0) return 0;
  return (page - 1) * pageSize + 1;
}

export function getPaginationEnd(total: number, page: number, pageSize: number, visibleCount: number): number {
  if (total === 0) return 0;
  return Math.min((page - 1) * pageSize + visibleCount, total);
}
