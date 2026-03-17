"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import { SidebarDesktopNav } from "./SidebarDesktopNav";
import type { MobileSpaceLink, SidebarProps } from "./Sidebar.types";
import { getBestMatchingHref, getSpaceFromHref } from "./Sidebar.utils";
import { useSidebarState } from "./useSidebarState";

export type { SidebarLink, SidebarProps, SpaceKey } from "./Sidebar.types";

function getRootClass(mode: SidebarProps["mode"]) {
  return [
    "sidebar",
    mode === "mobile" ? "sidebar--mobile-only" : null,
    mode === "desktop" ? "sidebar--desktop-only" : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function isMobileSpaceActive(pathname: string | null, space: MobileSpaceLink) {
  if (!pathname) return false;
  const activeByAlias = space.activePaths?.some((prefix) => pathname.startsWith(prefix)) ?? false;
  return activeByAlias || pathname.startsWith(space.href);
}

export function Sidebar({ title = "Navigation", links, footer, mode = "full", mobileSpaces = [] }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const showMobile = mode !== "desktop";
  const showDesktop = mode !== "mobile";
  const {
    activeMobileVisibleHref,
    activeVisibleHref,
    availableSpaces,
    close,
    currentLabel,
    getGroupOpen,
    isOpen,
    mobileVisibleLinks,
    persistOpenState,
    resolvedMobileSpace,
    setMobileSpace,
    toggle,
    toggleGroup,
    visibleLinks,
  } = useSidebarState({ links, pathname, searchParams });

  const rootClass = getRootClass(mode);

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
            <span className="sidebar__mobile-trigger-label">{mode === "mobile" ? "Menu" : currentLabel}</span>
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
                        className={`sidebar__mobile-space ${isMobileSpaceActive(pathname, space) ? "is-active" : ""}`}
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
                                    style={{ "--dropdown-item-index": String(index) } as CSSProperties}
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
        <SidebarDesktopNav
          links={visibleLinks}
          activeVisibleHref={activeVisibleHref}
          pathname={pathname}
          searchParams={searchParams}
          getGroupOpen={getGroupOpen}
          toggleGroup={toggleGroup}
        />
      ) : null}

      {showDesktop && footer ? <div className="sidebar__footer">{footer}</div> : null}
    </div>
  );
}
