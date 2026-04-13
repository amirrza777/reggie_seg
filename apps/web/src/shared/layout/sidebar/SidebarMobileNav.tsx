"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { SidebarChevron } from "./SidebarChevron";
import type { MobileSpaceLink, SidebarLink, SpaceKey } from "../Sidebar.types";
import { getBestMatchingHref, getSpaceFromHref, type SearchParamsReader } from "./Sidebar.utils";

type SidebarMobileNavProps = {
  mode: "full" | "desktop" | "mobile";
  title: string;
  isOpen: boolean;
  currentLabel: string;
  close: () => void;
  toggle: () => void;
  mobileSpaces: MobileSpaceLink[];
  pathname: string | null;
  availableSpaces: Array<{ key: SpaceKey; label: string }>;
  resolvedMobileSpace: SpaceKey;
  setMobileSpace: (space: SpaceKey) => void;
  persistOpenState: (space?: SpaceKey) => void;
  mobileVisibleLinks: SidebarLink[];
  activeMobileVisibleHref: string | null;
  getGroupOpen: (link: SidebarLink) => boolean;
  toggleGroup: (href: string, isOpenGroup: boolean) => void;
  searchParams: SearchParamsReader;
};

function isMobileSpaceActive(pathname: string | null, space: MobileSpaceLink) {
  if (!pathname) {return false;}
  const activeByAlias = space.activePaths?.some((prefix) => pathname.startsWith(prefix)) ?? false;
  return activeByAlias || pathname.startsWith(space.href);
}

function SidebarMobileSpaces(props: Pick<
  SidebarMobileNavProps,
  "mobileSpaces" | "pathname" | "availableSpaces" | "resolvedMobileSpace" | "setMobileSpace" | "persistOpenState"
>) {
  if (props.mobileSpaces.length > 1) {
    return <SidebarMobileLinkedSpaces {...props} />;
  }

  if (props.availableSpaces.length > 1) {
    return <SidebarMobileSpaceTabs {...props} />;
  }

  return null;
}

function SidebarMobileLinkedSpaces({
  mobileSpaces,
  pathname,
  setMobileSpace,
  persistOpenState,
}: Pick<SidebarMobileNavProps, "mobileSpaces" | "pathname" | "setMobileSpace" | "persistOpenState">) {
  return (
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
  );
}

function SidebarMobileSpaceTabs({
  availableSpaces,
  resolvedMobileSpace,
  setMobileSpace,
}: Pick<SidebarMobileNavProps, "availableSpaces" | "resolvedMobileSpace" | "setMobileSpace">) {
  return (
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
  );
}

type SidebarMobileGroupProps = {
  link,
  isParentActive,
  close,
  getGroupOpen,
  toggleGroup,
  pathname,
  searchParams,
};

function SidebarMobileGroup({
  link,
  isParentActive,
  close,
  getGroupOpen,
  toggleGroup,
  pathname,
  searchParams,
}: SidebarMobileGroupProps) {
  const groupOpen = getGroupOpen(link);
  const activeChildHref = getBestMatchingHref(link.children ?? [], pathname, searchParams);
  const groupActive = isParentActive || Boolean(activeChildHref);

  return (
    <div className="sidebar__mobile-group" key={link.href}>
      <SidebarMobileGroupTrigger link={link} groupOpen={groupOpen} groupActive={groupActive} toggleGroup={toggleGroup} />
      <SidebarMobileGroupCollapse link={link} groupOpen={groupOpen} activeChildHref={activeChildHref} close={close} />
    </div>
  );
}

function SidebarMobileGroupTrigger({
  link,
  groupOpen,
  groupActive,
  toggleGroup,
}: {
  link: SidebarLink;
  groupOpen: boolean;
  groupActive: boolean;
  toggleGroup: (href: string, isOpenGroup: boolean) => void;
}) {
  return (
    <button type="button" className={`sidebar__mobile-group-trigger ${groupActive ? "is-active" : ""}`} onClick={() => toggleGroup(link.href, groupOpen)} aria-expanded={groupOpen}>
      <span>{link.label}</span>
      <SidebarChevron isOpen={groupOpen} />
    </button>
  );
}

function SidebarMobileGroupCollapse({
  link,
  groupOpen,
  activeChildHref,
  close,
}: {
  link: SidebarLink;
  groupOpen: boolean;
  activeChildHref: string | null;
  close: () => void;
}) {
  return (
    <div className={`sidebar__mobile-group-collapse ${groupOpen ? "is-open" : ""}`} aria-hidden={!groupOpen}>
      <div className="sidebar__mobile-group-collapse-inner">
        <SidebarMobileChildLinks childrenLinks={link.children ?? []} activeChildHref={activeChildHref} groupOpen={groupOpen} close={close} />
      </div>
    </div>
  );
}

type SidebarMobileChildLinksProps = {
  childrenLinks: NonNullable<SidebarLink["children"]>;
  activeChildHref: string | null;
  groupOpen: boolean;
  close: () => void;
};

function SidebarMobileChildLinks({
  childrenLinks,
  activeChildHref,
  groupOpen,
  close,
}: SidebarMobileChildLinksProps) {
  return (
    <div className="sidebar__mobile-group-items">
      {childrenLinks.map((child, index) => {
        return <SidebarMobileChildLink key={child.href} child={child} index={index} activeChildHref={activeChildHref} groupOpen={groupOpen} close={close} />;
      })}
    </div>
  );
}

function SidebarMobileChildLink({
  child,
  index,
  activeChildHref,
  groupOpen,
  close,
}: {
  child: NonNullable<SidebarLink["children"]>[number];
  index: number;
  activeChildHref: string | null;
  groupOpen: boolean;
  close: () => void;
}) {
  const isChildActive = activeChildHref === child.href;
  return (
    <Link href={child.href} className={`sidebar__mobile-sublink ${isChildActive ? "is-active" : ""}`} onClick={close} style={{ "--dropdown-item-index": String(index) } as CSSProperties} tabIndex={groupOpen ? undefined : -1}>
      {child.label}
    </Link>
  );
}

type SidebarMobileLinksProps = Pick<
  SidebarMobileNavProps,
  "mobileVisibleLinks" | "activeMobileVisibleHref" | "close" | "getGroupOpen" | "toggleGroup" | "pathname" | "searchParams"
>;

function SidebarMobileLinks({
  mobileVisibleLinks,
  activeMobileVisibleHref,
  close,
  getGroupOpen,
  toggleGroup,
  pathname,
  searchParams,
}: SidebarMobileLinksProps) {
  return (
    <nav className="sidebar__mobile-nav">
      {mobileVisibleLinks.map((link) => <SidebarMobileLinkItem key={link.href} link={link} activeMobileVisibleHref={activeMobileVisibleHref} close={close} getGroupOpen={getGroupOpen} toggleGroup={toggleGroup} pathname={pathname} searchParams={searchParams} />)}
    </nav>
  );
}

function SidebarMobileLinkItem({
  link,
  activeMobileVisibleHref,
  close,
  getGroupOpen,
  toggleGroup,
  pathname,
  searchParams,
}: { link: SidebarLink } & Omit<SidebarMobileLinksProps, "mobileVisibleLinks">) {
  const isParentActive = activeMobileVisibleHref === link.href;
  if (!link.children?.length) {
    return <Link href={link.href} className={`sidebar__mobile-link ${isParentActive ? "is-active" : ""}`} onClick={close}>{link.label}</Link>;
  }
  return <SidebarMobileGroup link={link} isParentActive={isParentActive} close={close} getGroupOpen={getGroupOpen} toggleGroup={toggleGroup} pathname={pathname} searchParams={searchParams} />;
}

export function SidebarMobileNav(props: SidebarMobileNavProps) {
  return (
    <div className="sidebar__mobile">
      <SidebarMobileTrigger mode={props.mode} isOpen={props.isOpen} currentLabel={props.currentLabel} toggle={props.toggle} />
      {props.isOpen ? <SidebarMobileDrawer {...props} /> : null}
    </div>
  );
}

function SidebarMobileTrigger({
  mode,
  isOpen,
  currentLabel,
  toggle,
}: Pick<SidebarMobileNavProps, "mode" | "isOpen" | "currentLabel" | "toggle">) {
  return (
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
      {mode === "mobile" ? null : <SidebarChevron isOpen={isOpen} />}
    </button>
  );
}

function SidebarMobileDrawerHeader({ title, close }: Pick<SidebarMobileNavProps, "title" | "close">) {
  return (
    <div className="sidebar__mobile-header">
      <p className="eyebrow">{title}</p>
      <button type="button" className="sidebar__mobile-close" onClick={close} aria-label="Close menu">
        ✕
      </button>
    </div>
  );
}

function SidebarMobileDrawer(props: SidebarMobileNavProps) {
  return (
    <div className="sidebar__mobile-overlay sidebar__mobile-overlay--drawer" role="dialog" aria-modal="true" onClick={props.close}>
      <div
        className="sidebar__mobile-sheet sidebar__mobile-sheet--drawer"
        id="sidebar-mobile-menu"
        onClick={(event) => event.stopPropagation()}
      >
        <SidebarMobileDrawerHeader title={props.title} close={props.close} />

        <SidebarMobileSpaces
          mobileSpaces={props.mobileSpaces}
          pathname={props.pathname}
          availableSpaces={props.availableSpaces}
          resolvedMobileSpace={props.resolvedMobileSpace}
          setMobileSpace={props.setMobileSpace}
          persistOpenState={props.persistOpenState}
        />

        <SidebarMobileLinks
          mobileVisibleLinks={props.mobileVisibleLinks}
          activeMobileVisibleHref={props.activeMobileVisibleHref}
          close={props.close}
          getGroupOpen={props.getGroupOpen}
          toggleGroup={props.toggleGroup}
          pathname={props.pathname}
          searchParams={props.searchParams}
        />
      </div>
    </div>
  );
}
