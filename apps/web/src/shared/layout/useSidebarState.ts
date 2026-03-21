import { useMemo, useState } from "react";
import { MOBILE_DRAWER_PERSIST_KEY, MOBILE_DRAWER_SPACE_KEY, SPACE_ORDER } from "./Sidebar.constants";
import type { SidebarLink, SpaceKey } from "./Sidebar.types";
import { isHrefActive, type SearchParamsReader } from "./Sidebar.utils";
import { computeSidebarDerivedState } from "./sidebarDerivedState";

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
  const derived = useMemo(
    () => computeSidebarDerivedState({ links, pathname, searchParams, mobileSpace }),
    [links, pathname, searchParams, mobileSpace]
  );

  const close = () => {
    clearPersistedDrawerState();
    setIsOpen(false);
  };

  const open = () => {
    setMobileSpace(resolveDrawerSpace(derived.currentSpace, derived.availableSpaces));
    setIsOpen(true);
  };

  const toggle = () => (isOpen ? close() : open());

  const toggleGroup = (href: string, isOpenGroup: boolean) =>
    setExpandedGroups((prev) => ({
      ...prev,
      [href]: !isOpenGroup,
    }));

  const getGroupOpen = (link: SidebarLink) => resolveGroupOpen(link, expandedGroups, pathname, searchParams);

  return {
    activeMobileVisibleHref: derived.activeMobileVisibleHref,
    activeVisibleHref: derived.activeVisibleHref,
    availableSpaces: derived.availableSpaces,
    close,
    currentLabel: derived.currentLabel,
    currentSpace: derived.currentSpace,
    getGroupOpen,
    isOpen,
    mobileVisibleLinks: derived.mobileVisibleLinks,
    persistOpenState: persistDrawerOpenState,
    resolvedMobileSpace: derived.resolvedMobileSpace,
    setMobileSpace,
    toggle,
    toggleGroup,
    visibleLinks: derived.visibleLinks,
  };
}

function clearPersistedDrawerState() {
  try {
    window.sessionStorage.removeItem(MOBILE_DRAWER_PERSIST_KEY);
    window.sessionStorage.removeItem(MOBILE_DRAWER_SPACE_KEY);
  } catch {
    // Ignore storage access issues (private mode / strict privacy settings).
  }
}

function persistDrawerOpenState(space?: SpaceKey) {
  try {
    window.sessionStorage.setItem(MOBILE_DRAWER_PERSIST_KEY, "1");
    if (space) window.sessionStorage.setItem(MOBILE_DRAWER_SPACE_KEY, space);
  } catch {
    // Ignore storage access issues (private mode / strict privacy settings).
  }
}

function resolveDrawerSpace(currentSpace: SpaceKey, availableSpaces: { key: SpaceKey }[]): SpaceKey {
  return currentSpace ?? availableSpaces[0]?.key ?? "workspace";
}

function resolveGroupOpen(
  link: SidebarLink,
  expandedGroups: Record<string, boolean>,
  pathname: string | null,
  searchParams: SearchParamsReader
) {
  const childActive = (link.children ?? []).some((child) => isHrefActive(child.href, pathname, searchParams));
  const parentActive = isHrefActive(link.href, pathname, searchParams);
  const isActiveGroup = parentActive || childActive;
  const explicit = expandedGroups[link.href];
  if (explicit === undefined) return Boolean(link.defaultExpanded ?? isActiveGroup);
  return explicit;
}
