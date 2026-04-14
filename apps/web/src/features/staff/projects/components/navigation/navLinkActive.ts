export function isStaffNavLinkActive({
  pathname,
  baseHref,
  href,
  isOverview,
}: {
  pathname: string | null;
  baseHref: string;
  href: string;
  isOverview: boolean;
}): boolean {
  if (!pathname) {
    return false;
  }
  if (isOverview) {
    return pathname === baseHref;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
