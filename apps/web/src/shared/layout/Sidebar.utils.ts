import type { SpaceKey } from "./Sidebar.types";

type HrefTarget = {
  href: string;
};

export type SearchParamsReader = Pick<URLSearchParams, "get"> | null;

export function normalizePath(path: string) {
  if (path === "/") {return "/";}
  return path.replace(/\/+$/, "");
}

export function isHrefActive(href: string, pathname: string | null, searchParams: SearchParamsReader) {
  if (!pathname) {return false;}

  const [rawPath, rawQuery] = href.split("?");
  const targetPath = normalizePath(rawPath);
  const currentPath = normalizePath(pathname);

  const pathMatches =
    targetPath === "/"
      ? currentPath === "/"
      : currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);

  if (!pathMatches) {return false;}
  if (!rawQuery) {return true;}
  if (!searchParams) {return false;}

  const requiredParams = new URLSearchParams(rawQuery);
  for (const [key, value] of requiredParams.entries()) {
    if (searchParams.get(key) !== value) {return false;}
  }

  return true;
}

export function getBestMatchingHref<T extends HrefTarget>(
  targets: T[],
  pathname: string | null,
  searchParams: SearchParamsReader
) {
  const matching = targets.filter((target) => isHrefActive(target.href, pathname, searchParams));
  if (matching.length === 0) {return null;}
  return matching.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

export function getSpaceFromHref(href: string): SpaceKey {
  const [rawPath] = href.split("?");
  const targetPath = normalizePath(rawPath);
  if (targetPath.startsWith("/enterprise")) {return "enterprise";}
  if (targetPath.startsWith("/admin")) {return "admin";}
  if (targetPath.startsWith("/staff")) {return "staff";}
  return "workspace";
}
