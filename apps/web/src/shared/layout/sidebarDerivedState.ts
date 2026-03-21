import { SPACE_LABELS, SPACE_ORDER } from "./Sidebar.constants";
import type { MobileSpaceOption, SidebarLink, SpaceKey } from "./Sidebar.types";
import { getBestMatchingHref, isHrefActive, type SearchParamsReader } from "./Sidebar.utils";

type DerivedSidebarStateInput = {
  links: SidebarLink[];
  pathname: string | null;
  searchParams: SearchParamsReader;
  mobileSpace: SpaceKey;
};

export type DerivedSidebarState = {
  currentSpace: SpaceKey;
  availableSpaces: MobileSpaceOption[];
  resolvedMobileSpace: SpaceKey;
  visibleLinks: SidebarLink[];
  mobileVisibleLinks: SidebarLink[];
  activeVisibleHref: string | null;
  activeMobileVisibleHref: string | null;
  currentLabel: string;
};

export function computeSidebarDerivedState({ links, pathname, searchParams, mobileSpace }: DerivedSidebarStateInput): DerivedSidebarState {
  const activeLink = findActiveLink(links, pathname, searchParams);
  const currentSpace = resolveCurrentSpace(pathname, activeLink?.space);
  const availableSpaces = buildAvailableSpaces(links);
  const resolvedMobileSpace = resolveMobileSpace(availableSpaces, mobileSpace, currentSpace);
  const visibleLinks = links.filter((link) => !link.space || link.space === currentSpace);
  const mobileVisibleLinks = links.filter((link) => !link.space || link.space === resolvedMobileSpace);
  const activeVisibleHref = getBestMatchingHref(visibleLinks, pathname, searchParams);
  const activeMobileVisibleHref = getBestMatchingHref(mobileVisibleLinks, pathname, searchParams);
  const currentLabel = resolveCurrentLabel(visibleLinks, pathname, searchParams);

  return {
    currentSpace,
    availableSpaces,
    resolvedMobileSpace,
    visibleLinks,
    mobileVisibleLinks,
    activeVisibleHref,
    activeMobileVisibleHref,
    currentLabel,
  };
}

function findActiveLink(links: SidebarLink[], pathname: string | null, searchParams: SearchParamsReader): SidebarLink | undefined {
  if (!pathname) return undefined;
  const matching = links.filter((link) => isHrefActive(link.href, pathname, searchParams));
  return matching.sort((a, b) => b.href.length - a.href.length)[0];
}

function resolveCurrentSpace(pathname: string | null, activeSpace?: SpaceKey): SpaceKey {
  if (activeSpace) return activeSpace;
  if (!pathname) return "workspace";
  if (pathname.startsWith("/enterprise")) return "enterprise";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/staff")) return "staff";
  return "workspace";
}

function buildAvailableSpaces(links: SidebarLink[]): MobileSpaceOption[] {
  const found = new Set<SpaceKey>();
  for (const link of links) {
    if (link.space) found.add(link.space);
  }

  return SPACE_ORDER.filter((space) => found.has(space)).map((space) => ({
    key: space,
    label: SPACE_LABELS[space],
  }));
}

function resolveMobileSpace(
  availableSpaces: MobileSpaceOption[],
  mobileSpace: SpaceKey,
  currentSpace: SpaceKey
): SpaceKey {
  if (availableSpaces.some((space) => space.key === mobileSpace)) return mobileSpace;
  return currentSpace ?? availableSpaces[0]?.key ?? "workspace";
}

function resolveCurrentLabel(visibleLinks: SidebarLink[], pathname: string | null, searchParams: SearchParamsReader): string {
  const visibleTargets = visibleLinks.flatMap((link) => [link, ...(link.children ?? [])]);
  if (!pathname) return visibleTargets[0]?.label ?? "Menu";

  const matching = visibleTargets.filter((link) => isHrefActive(link.href, pathname, searchParams));
  const best = matching.sort((a, b) => b.href.length - a.href.length)[0];
  return best?.label ?? visibleTargets[0]?.label ?? "Menu";
}
