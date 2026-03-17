import { useMemo, useState } from "react";
import { MOBILE_DRAWER_PERSIST_KEY, MOBILE_DRAWER_SPACE_KEY, SPACE_LABELS, SPACE_ORDER } from "./Sidebar.constants";
import type { MobileSpaceOption, SidebarLink, SpaceKey } from "./Sidebar.types";
import { getBestMatchingHref, isHrefActive, type SearchParamsReader } from "./Sidebar.utils";

type UseSidebarStateInput = {
  links: SidebarLink[];
  pathname: string | null;
  searchParams: SearchParamsReader;
};

function getPersistedDrawerState(): { isOpen: boolean; space: SpaceKey } {
  if (typeof window === "undefined") {
    return { isOpen: false, space: "workspace" };
  }

  try {
    const persistedOpen = window.sessionStorage.getItem(MOBILE_DRAWER_PERSIST_KEY) === "1";
    const persistedSpace = window.sessionStorage.getItem(MOBILE_DRAWER_SPACE_KEY);
    const isKnownSpace = persistedSpace && SPACE_ORDER.includes(persistedSpace as SpaceKey);
    return {
      isOpen: persistedOpen,
      space: isKnownSpace ? (persistedSpace as SpaceKey) : "workspace",
    };
  } catch {
    return { isOpen: false, space: "workspace" };
  }
}

export function useSidebarState({ links, pathname, searchParams }: UseSidebarStateInput) {
  const [isOpen, setIsOpen] = useState(() => getPersistedDrawerState().isOpen);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [mobileSpace, setMobileSpace] = useState<SpaceKey>(() => getPersistedDrawerState().space);

  const activeLink = useMemo(() => {
    if (!pathname) return undefined;
    const matching = links.filter((link) => isHrefActive(link.href, pathname, searchParams));
    return matching.sort((a, b) => b.href.length - a.href.length)[0];
  }, [links, pathname, searchParams]);

  const currentSpace: SpaceKey = useMemo(() => {
    if (activeLink?.space) return activeLink.space;
    if (!pathname) return "workspace";
    if (pathname.startsWith("/enterprise")) return "enterprise";
    if (pathname.startsWith("/admin")) return "admin";
    if (pathname.startsWith("/staff")) return "staff";
    return "workspace";
  }, [activeLink, pathname]);

  const availableSpaces = useMemo<MobileSpaceOption[]>(() => {
    const found = new Set<SpaceKey>();
    for (const link of links) {
      if (link.space) found.add(link.space);
    }

    return SPACE_ORDER.filter((space) => found.has(space)).map((space) => ({
      key: space,
      label: SPACE_LABELS[space],
    }));
  }, [links]);

  const resolvedMobileSpace: SpaceKey = useMemo(() => {
    if (availableSpaces.some((space) => space.key === mobileSpace)) return mobileSpace;
    return currentSpace ?? availableSpaces[0]?.key ?? "workspace";
  }, [availableSpaces, currentSpace, mobileSpace]);

  const visibleLinks = useMemo(() => links.filter((link) => !link.space || link.space === currentSpace), [links, currentSpace]);

  const mobileVisibleLinks = useMemo(
    () => links.filter((link) => !link.space || link.space === resolvedMobileSpace),
    [links, resolvedMobileSpace]
  );

  const activeVisibleHref = useMemo(
    () => getBestMatchingHref(visibleLinks, pathname, searchParams),
    [pathname, searchParams, visibleLinks]
  );

  const activeMobileVisibleHref = useMemo(
    () => getBestMatchingHref(mobileVisibleLinks, pathname, searchParams),
    [mobileVisibleLinks, pathname, searchParams]
  );

  const currentLabel = useMemo(() => {
    const visibleTargets = visibleLinks.flatMap((link) => [link, ...(link.children ?? [])]);
    if (!pathname) return visibleTargets[0]?.label ?? "Menu";
    const matching = visibleTargets.filter((link) => isHrefActive(link.href, pathname, searchParams));
    return matching.sort((a, b) => b.href.length - a.href.length)[0]?.label ?? visibleTargets[0]?.label ?? "Menu";
  }, [pathname, searchParams, visibleLinks]);

  const clearPersistedOpenState = () => {
    try {
      window.sessionStorage.removeItem(MOBILE_DRAWER_PERSIST_KEY);
      window.sessionStorage.removeItem(MOBILE_DRAWER_SPACE_KEY);
    } catch {
      // Ignore storage access issues (private mode / strict privacy settings).
    }
  };

  const persistOpenState = (space?: SpaceKey) => {
    try {
      window.sessionStorage.setItem(MOBILE_DRAWER_PERSIST_KEY, "1");
      if (space) window.sessionStorage.setItem(MOBILE_DRAWER_SPACE_KEY, space);
    } catch {
      // Ignore storage access issues (private mode / strict privacy settings).
    }
  };

  const close = () => {
    clearPersistedOpenState();
    setIsOpen(false);
  };

  const open = () => {
    setMobileSpace(currentSpace ?? availableSpaces[0]?.key ?? "workspace");
    setIsOpen(true);
  };

  const toggle = () => {
    if (isOpen) {
      close();
      return;
    }
    open();
  };

  const toggleGroup = (href: string, isOpenGroup: boolean) =>
    setExpandedGroups((prev) => ({
      ...prev,
      [href]: !isOpenGroup,
    }));

  const getGroupOpen = (link: SidebarLink) => {
    const childActive = (link.children ?? []).some((child) => isHrefActive(child.href, pathname, searchParams));
    const parentActive = isHrefActive(link.href, pathname, searchParams);
    const isActiveGroup = parentActive || childActive;
    const explicit = expandedGroups[link.href];
    if (explicit === undefined) return Boolean(link.defaultExpanded ?? isActiveGroup);
    return explicit;
  };

  return {
    activeMobileVisibleHref,
    activeVisibleHref,
    availableSpaces,
    close,
    currentLabel,
    currentSpace,
    getGroupOpen,
    isOpen,
    mobileVisibleLinks,
    persistOpenState,
    resolvedMobileSpace,
    setMobileSpace,
    toggle,
    toggleGroup,
    visibleLinks,
  };
}
