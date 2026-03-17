"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

export type SidebarLink = {
  href: string;
  label: string;
  space?: "workspace" | "staff" | "enterprise" | "admin";
  flag?: string;
  children?: Array<{ href: string; label: string; flag?: string }>;
  defaultExpanded?: boolean;
};

type SidebarMode = "full" | "desktop" | "mobile";

type MobileSpaceLink = {
  href: string;
  label: string;
  activePaths?: string[];
};

type SidebarProps = {
  title?: string;
  links: SidebarLink[];
  footer?: ReactNode;
  mode?: SidebarMode;
  mobileSpaces?: MobileSpaceLink[];
};

type HrefTarget = {
  href: string;
};

type SpaceKey = NonNullable<SidebarLink["space"]>;

type MobileSpaceOption = {
  key: SpaceKey;
  label: string;
};

const SPACE_LABELS: Record<SpaceKey, string> = {
  workspace: "Workspace",
  staff: "Staff",
  enterprise: "Enterprise",
  admin: "Admin",
};

const SPACE_ORDER: SpaceKey[] = ["workspace", "staff", "enterprise", "admin"];
const MOBILE_DRAWER_PERSIST_KEY = "app-shell-mobile-drawer-open";
const MOBILE_DRAWER_SPACE_KEY = "app-shell-mobile-drawer-space";

function normalizePath(path: string) {
  if (path === "/") return "/";
  return path.replace(/\/+$/, "");
}

function isHrefActive(
  href: string,
  pathname: string | null,
  searchParams: Pick<URLSearchParams, "get"> | null
) {
  if (!pathname) return false;

  const [rawPath, rawQuery] = href.split("?");
  const targetPath = normalizePath(rawPath);
  const currentPath = normalizePath(pathname);

  const pathMatches =
    targetPath === "/"
      ? currentPath === "/"
      : currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);

  if (!pathMatches) return false;
  if (!rawQuery) return true;
  if (!searchParams) return false;

  const requiredParams = new URLSearchParams(rawQuery);
  for (const [key, value] of requiredParams.entries()) {
    if (searchParams.get(key) !== value) return false;
  }

  return true;
}

function getBestMatchingHref<T extends HrefTarget>(
  targets: T[],
  pathname: string | null,
  searchParams: Pick<URLSearchParams, "get"> | null
) {
  const matching = targets.filter((target) => isHrefActive(target.href, pathname, searchParams));
  if (matching.length === 0) return null;
  return matching.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

function getSpaceFromHref(href: string): SpaceKey {
  const [rawPath] = href.split("?");
  const targetPath = normalizePath(rawPath);
  if (targetPath.startsWith("/enterprise")) return "enterprise";
  if (targetPath.startsWith("/admin")) return "admin";
  if (targetPath.startsWith("/staff")) return "staff";
  return "workspace";
}

export function Sidebar({ title = "Navigation", links, footer, mode = "full", mobileSpaces = [] }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [mobileSpace, setMobileSpace] = useState<SpaceKey>("workspace");

  const showMobile = mode !== "desktop";
  const showDesktop = mode !== "mobile";

  const activeLink = useMemo(() => {
    if (!pathname) return undefined;
    const matching = links.filter((link) => isHrefActive(link.href, pathname, searchParams));
    return matching.sort((a, b) => b.href.length - a.href.length)[0];
  }, [links, pathname, searchParams]);

  const currentSpace: SidebarLink["space"] = useMemo(() => {
    if (activeLink?.space) return activeLink.space;
    if (!pathname) return "workspace";
    if (pathname.startsWith("/enterprise")) return "enterprise";
    if (pathname.startsWith("/admin")) return "admin";
    if (pathname.startsWith("/staff")) return "staff";
    return "workspace";
  }, [pathname, activeLink]);

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

  const visibleLinks = useMemo(() => {
    return links.filter((link) => !link.space || link.space === currentSpace);
  }, [links, currentSpace]);

  const mobileVisibleLinks = useMemo(() => {
    return links.filter((link) => !link.space || link.space === resolvedMobileSpace);
  }, [links, resolvedMobileSpace]);

  const activeVisibleHref = useMemo(
    () => getBestMatchingHref(visibleLinks, pathname, searchParams),
    [visibleLinks, pathname, searchParams],
  );

  const activeMobileVisibleHref = useMemo(
    () => getBestMatchingHref(mobileVisibleLinks, pathname, searchParams),
    [mobileVisibleLinks, pathname, searchParams],
  );

  const current = useMemo(() => {
    const visibleTargets = visibleLinks.flatMap((link) => [link, ...(link.children ?? [])]);
    if (!pathname) return visibleTargets[0];
    const matching = visibleTargets.filter((link) => isHrefActive(link.href, pathname, searchParams));
    return matching.sort((a, b) => b.href.length - a.href.length)[0] ?? visibleTargets[0];
  }, [visibleLinks, pathname, searchParams]);

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
  const getDropdownItemStyle = (index: number): CSSProperties =>
    ({ "--dropdown-item-index": String(index) }) as CSSProperties;

  const getGroupOpen = (link: SidebarLink) => {
    const childActive = (link.children ?? []).some((child) => isHrefActive(child.href, pathname, searchParams));
    const parentActive = isHrefActive(link.href, pathname, searchParams);
    const isActiveGroup = parentActive || childActive;
    const explicit = expandedGroups[link.href];
    if (explicit === undefined) return Boolean(link.defaultExpanded ?? isActiveGroup);
    return explicit;
  };

  const rootClass = [
    "sidebar",
    mode === "mobile" ? "sidebar--mobile-only" : null,
    mode === "desktop" ? "sidebar--desktop-only" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const isMobileSpaceActive = (space: MobileSpaceLink) => {
    if (!pathname) return false;
    const activeByAlias = space.activePaths?.some((prefix) => pathname.startsWith(prefix)) ?? false;
    return activeByAlias || pathname.startsWith(space.href);
  };

  useEffect(() => {
    if (!showMobile) return;
    try {
      if (window.sessionStorage.getItem(MOBILE_DRAWER_PERSIST_KEY) !== "1") return;
      const persistedSpace = window.sessionStorage.getItem(MOBILE_DRAWER_SPACE_KEY);
      if (persistedSpace && SPACE_ORDER.includes(persistedSpace as SpaceKey)) {
        setMobileSpace(persistedSpace as SpaceKey);
      }
      setIsOpen(true);
    } catch {
      // Ignore storage access issues (private mode / strict privacy settings).
    }
  }, [pathname, showMobile]);

  return (
    <div className={rootClass}>
      {showMobile ? (
        <div className="sidebar__mobile">
          <button
            type="button"
            className={`sidebar__mobile-trigger ${mode === "mobile" ? "sidebar__mobile-trigger--icon" : ""}`}
            onClick={toggle}
            aria-expanded={isOpen}
            aria-controls="sidebar-mobile-menu"
            aria-label={mode === "mobile" ? "Open navigation menu" : undefined}
          >
            <span className="sidebar__mobile-trigger-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </span>
            <span className="sidebar__mobile-trigger-label">{mode === "mobile" ? "Menu" : current?.label ?? "Menu"}</span>
            {mode === "mobile" ? null : <span className={`sidebar__chevron ${isOpen ? "is-open" : ""}`}>{isOpen ? "↑" : "↓"}</span>}
          </button>

          {isOpen ? (
            <div className="sidebar__mobile-overlay sidebar__mobile-overlay--drawer" role="dialog" aria-modal="true" onClick={close}>
              <div
                className="sidebar__mobile-sheet sidebar__mobile-sheet--drawer"
                id="sidebar-mobile-menu"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sidebar__mobile-header">
                  <p className="eyebrow">{title}</p>
                  <button type="button" className="sidebar__mobile-close" onClick={close} aria-label="Close menu">
                    ✕
                  </button>
                </div>

                {mobileSpaces.length > 1 ? (
                  <div className="sidebar__mobile-spaces" aria-label="Choose space">
                    {mobileSpaces.map((space) => (
                      <Link
                        key={space.href}
                        href={space.href}
                        className={`sidebar__mobile-space ${isMobileSpaceActive(space) ? "is-active" : ""}`}
                        onClick={() => {
                          const nextSpace = getSpaceFromHref(space.href);
                          setMobileSpace(nextSpace);
                          persistOpenState(nextSpace);
                        }}
                      >
                        {space.label}
                      </Link>
                    ))}
                  </div>
                ) : availableSpaces.length > 1 ? (
                  <div className="sidebar__mobile-spaces" role="tablist" aria-label="Choose space">
                    {availableSpaces.map((space) => (
                      <button
                        key={space.key}
                        type="button"
                        className={`sidebar__mobile-space ${resolvedMobileSpace === space.key ? "is-active" : ""}`}
                        onClick={() => setMobileSpace(space.key)}
                        role="tab"
                        aria-selected={resolvedMobileSpace === space.key}
                      >
                        {space.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                <nav className="sidebar__mobile-nav">
                  {mobileVisibleLinks.map((link) => {
                    const hasChildren = Boolean(link.children && link.children.length > 0);
                    const isParentActive = activeMobileVisibleHref === link.href;
                    if (!hasChildren) {
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`sidebar__mobile-link ${isParentActive ? "is-active" : ""}`}
                          onClick={close}
                        >
                          {link.label}
                        </Link>
                      );
                    }

                    const groupOpen = getGroupOpen(link);
                    const activeChildHref = getBestMatchingHref(link.children ?? [], pathname, searchParams);
                    const childActive = Boolean(activeChildHref);
                    const groupActive = isParentActive || childActive;

                    return (
                      <div className="sidebar__mobile-group" key={link.href}>
                        <button
                          type="button"
                          className={`sidebar__mobile-group-trigger ${groupActive ? "is-active" : ""}`}
                          onClick={() => toggleGroup(link.href, groupOpen)}
                          aria-expanded={groupOpen}
                        >
                          <span>{link.label}</span>
                          <span className={`sidebar__chevron ${groupOpen ? "is-open" : ""}`}>{groupOpen ? "↑" : "↓"}</span>
                        </button>
                        <div
                          className={`sidebar__mobile-group-collapse ${groupOpen ? "is-open" : ""}`}
                          aria-hidden={!groupOpen}
                        >
                          <div className="sidebar__mobile-group-collapse-inner">
                            <div className="sidebar__mobile-group-items">
                              {(link.children ?? []).map((child, index) => {
                                const isChildActive = activeChildHref === child.href;
                                return (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    className={`sidebar__mobile-sublink ${isChildActive ? "is-active" : ""}`}
                                    onClick={close}
                                    style={getDropdownItemStyle(index)}
                                    tabIndex={groupOpen ? undefined : -1}
                                  >
                                    {child.label}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </nav>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {showDesktop ? (
        <nav className="sidebar__nav">
          {visibleLinks.map((link) => {
            const hasChildren = Boolean(link.children && link.children.length > 0);
            const isParentActive = activeVisibleHref === link.href;
            if (!hasChildren) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`sidebar__link ${isParentActive ? "is-active" : ""}`}
                  aria-current={isParentActive ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            }

            const groupOpen = getGroupOpen(link);
            const activeChildHref = getBestMatchingHref(link.children ?? [], pathname, searchParams);
            const childActive = Boolean(activeChildHref);
            const groupActive = isParentActive || childActive;

            return (
              <div className="sidebar__group" key={link.href}>
                <button
                type="button"
                className={`sidebar__group-trigger ${groupActive ? "is-active" : ""}`}
                onClick={() => toggleGroup(link.href, groupOpen)}
                aria-expanded={groupOpen}
              >
                  <span>{link.label}</span>
                  <span className={`sidebar__chevron ${groupOpen ? "is-open" : ""}`}>{groupOpen ? "↑" : "↓"}</span>
                </button>
                <div className={`sidebar__group-collapse ${groupOpen ? "is-open" : ""}`} aria-hidden={!groupOpen}>
                  <div className="sidebar__group-collapse-inner">
                    <div className="sidebar__group-items">
                      {(link.children ?? []).map((child, index) => {
                        const isChildActive = activeChildHref === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`sidebar__sublink ${isChildActive ? "is-active" : ""}`}
                            aria-current={isChildActive ? "page" : undefined}
                            style={getDropdownItemStyle(index)}
                            tabIndex={groupOpen ? undefined : -1}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      ) : null}

      {showDesktop && footer ? <div className="sidebar__footer">{footer}</div> : null}
    </div>
  );
}
