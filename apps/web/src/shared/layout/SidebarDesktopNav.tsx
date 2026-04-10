import Link from "next/link";
import type { CSSProperties } from "react";
import type { SidebarLink } from "./Sidebar.types";
import { SidebarChevron } from "./SidebarChevron";
import { getBestMatchingHref, type SearchParamsReader } from "./Sidebar.utils";

type SidebarDesktopNavProps = {
  links: SidebarLink[];
  activeVisibleHref: string | null;
  pathname: string | null;
  searchParams: SearchParamsReader;
  getGroupOpen: (link: SidebarLink) => boolean;
  toggleGroup: (href: string, isOpenGroup: boolean) => void;
};

const getDropdownItemStyle = (index: number): CSSProperties =>
  ({ "--dropdown-item-index": String(index) }) as CSSProperties;

function DesktopSidebarLink({ link, isParentActive }: { link: SidebarLink; isParentActive: boolean }) {
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

function DesktopSidebarGroup({
  link,
  isParentActive,
  pathname,
  searchParams,
  getGroupOpen,
  toggleGroup,
}: {
  link: SidebarLink;
  isParentActive: boolean;
  pathname: string | null;
  searchParams: SearchParamsReader;
  getGroupOpen: (link: SidebarLink) => boolean;
  toggleGroup: (href: string, isOpenGroup: boolean) => void;
}) {
  const groupOpen = getGroupOpen(link);
  const activeChildHref = getBestMatchingHref(link.children ?? [], pathname, searchParams);
  const groupActive = isParentActive || Boolean(activeChildHref);

  return (
    <div className="sidebar__group" key={link.href}>
      <button
        type="button"
        className={`sidebar__group-trigger ${groupActive ? "is-active" : ""}`}
        onClick={() => toggleGroup(link.href, groupOpen)}
        aria-expanded={groupOpen}
      >
        <span>{link.label}</span>
        <SidebarChevron isOpen={groupOpen} />
      </button>
      <div className={`sidebar__group-collapse ${groupOpen ? "is-open" : ""}`} aria-hidden={!groupOpen}>
        <div className="sidebar__group-collapse-inner">
          <DesktopSidebarChildLinks
            childrenLinks={link.children ?? []}
            activeChildHref={activeChildHref}
            groupOpen={groupOpen}
          />
        </div>
      </div>
    </div>
  );
}

function DesktopSidebarChildLinks({
  childrenLinks,
  activeChildHref,
  groupOpen,
}: {
  childrenLinks: NonNullable<SidebarLink["children"]>;
  activeChildHref: string | null;
  groupOpen: boolean;
}) {
  return (
    <div className="sidebar__group-items">
      {childrenLinks.map((child, index) => {
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
  );
}

export function SidebarDesktopNav({
  links,
  activeVisibleHref,
  pathname,
  searchParams,
  getGroupOpen,
  toggleGroup,
}: SidebarDesktopNavProps) {
  return (
    <nav className="sidebar__nav">
      {links.map((link) => {
        const hasChildren = Boolean(link.children?.length);
        const isParentActive = activeVisibleHref === link.href;
        if (!hasChildren) {return <DesktopSidebarLink key={link.href} link={link} isParentActive={isParentActive} />;}

        return (
          <DesktopSidebarGroup
            key={link.href}
            link={link}
            isParentActive={isParentActive}
            pathname={pathname}
            searchParams={searchParams}
            getGroupOpen={getGroupOpen}
            toggleGroup={toggleGroup}
          />
        );
      })}
    </nav>
  );
}
