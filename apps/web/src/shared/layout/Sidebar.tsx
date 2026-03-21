"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { SidebarDesktopNav } from "./SidebarDesktopNav";
import { SidebarMobileNav } from "./SidebarMobileNav";
import type { SidebarProps } from "./Sidebar.types";
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
        <SidebarMobileSection
          mode={mode}
          title={title}
          isOpen={isOpen}
          currentLabel={currentLabel}
          close={close}
          toggle={toggle}
          mobileSpaces={mobileSpaces}
          pathname={pathname}
          availableSpaces={availableSpaces}
          resolvedMobileSpace={resolvedMobileSpace}
          setMobileSpace={setMobileSpace}
          persistOpenState={persistOpenState}
          mobileVisibleLinks={mobileVisibleLinks}
          activeMobileVisibleHref={activeMobileVisibleHref}
          getGroupOpen={getGroupOpen}
          toggleGroup={toggleGroup}
          searchParams={searchParams}
        />
      ) : null}

      {showDesktop ? <SidebarDesktopSection state={{ visibleLinks, activeVisibleHref, pathname, searchParams, getGroupOpen, toggleGroup }} /> : null}

      {showDesktop && footer ? <div className="sidebar__footer">{footer}</div> : null}
    </div>
  );
}

function SidebarMobileSection(props: ComponentProps<typeof SidebarMobileNav>) {
  return <SidebarMobileNav {...props} />;
}

function SidebarDesktopSection({
  state,
}: {
  state: {
    visibleLinks: SidebarProps["links"];
    activeVisibleHref: string | null;
    pathname: string | null;
    searchParams: ReturnType<typeof useSearchParams>;
    getGroupOpen: (link: SidebarProps["links"][number]) => boolean;
    toggleGroup: (href: string, isOpenGroup: boolean) => void;
  };
}) {
  return (
    <SidebarDesktopNav
      links={state.visibleLinks}
      activeVisibleHref={state.activeVisibleHref}
      pathname={state.pathname}
      searchParams={state.searchParams}
      getGroupOpen={state.getGroupOpen}
      toggleGroup={state.toggleGroup}
    />
  );
}
