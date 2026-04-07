import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
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
  const state = useSidebarInternalState();
  const derived = useSidebarDerived(links, pathname, searchParams, state.mobileSpace);
  const drawerActions = useSidebarDrawerActions({ isOpen: state.isOpen, setIsOpen: state.setIsOpen, setMobileSpace: state.setMobileSpace, currentSpace: derived.currentSpace, availableSpaces: derived.availableSpaces });
  const groupState = useSidebarGroupState(state.expandedGroups, state.setExpandedGroups, pathname, searchParams);
  return buildSidebarStateResult({ derived, isOpen: state.isOpen, setMobileSpace: state.setMobileSpace, close: drawerActions.close, toggle: drawerActions.toggle, toggleGroup: groupState.toggleGroup, getGroupOpen: groupState.getGroupOpen });
}

function useSidebarInternalState() {
  const [isOpen, setIsOpen] = useState(() => getPersistedDrawerState().isOpen);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [mobileSpace, setMobileSpace] = useState<SpaceKey>(() => getPersistedDrawerState().space);
  return { isOpen, setIsOpen, expandedGroups, setExpandedGroups, mobileSpace, setMobileSpace };
}

function useSidebarDerived(links: SidebarLink[], pathname: string | null, searchParams: SearchParamsReader, mobileSpace: SpaceKey) {
  return useMemo(() => computeSidebarDerivedState({ links, pathname, searchParams, mobileSpace }), [links, pathname, searchParams, mobileSpace]);
}

function useSidebarDrawerActions(options: {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  setMobileSpace: (value: SpaceKey) => void;
  currentSpace: SpaceKey;
  availableSpaces: { key: SpaceKey }[];
}) {
  const close = () => { clearPersistedDrawerState(); options.setIsOpen(false); };
  const open = () => { options.setMobileSpace(resolveDrawerSpace(options.currentSpace, options.availableSpaces)); options.setIsOpen(true); };
  const toggle = () => (options.isOpen ? close() : open());
  return { close, toggle };
}

function useSidebarGroupState(
  expandedGroups: Record<string, boolean>,
  setExpandedGroups: Dispatch<SetStateAction<Record<string, boolean>>>,
  pathname: string | null,
  searchParams: SearchParamsReader,
) {
  const toggleGroup = (href: string, isOpenGroup: boolean) => setExpandedGroups((prev) => ({ ...prev, [href]: !isOpenGroup }));
  const getGroupOpen = (link: SidebarLink) => resolveGroupOpen(link, expandedGroups, pathname, searchParams);
  return { toggleGroup, getGroupOpen };
}

function buildSidebarStateResult(options: {
  derived: ReturnType<typeof computeSidebarDerivedState>;
  isOpen: boolean;
  setMobileSpace: (value: SpaceKey) => void;
  close: () => void;
  toggle: () => void;
  toggleGroup: (href: string, isOpenGroup: boolean) => void;
  getGroupOpen: (link: SidebarLink) => boolean;
}) {
  return { activeMobileVisibleHref: options.derived.activeMobileVisibleHref, activeVisibleHref: options.derived.activeVisibleHref, availableSpaces: options.derived.availableSpaces, close: options.close, currentLabel: options.derived.currentLabel, currentSpace: options.derived.currentSpace, getGroupOpen: options.getGroupOpen, isOpen: options.isOpen, mobileVisibleLinks: options.derived.mobileVisibleLinks, persistOpenState: persistDrawerOpenState, resolvedMobileSpace: options.derived.resolvedMobileSpace, setMobileSpace: options.setMobileSpace, toggle: options.toggle, toggleGroup: options.toggleGroup, visibleLinks: options.derived.visibleLinks };
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
    if (space) {
      window.sessionStorage.setItem(MOBILE_DRAWER_SPACE_KEY, space);
    }
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
  if (explicit === undefined) {
    return Boolean(link.defaultExpanded ?? isActiveGroup);
  }
  return explicit;
}
