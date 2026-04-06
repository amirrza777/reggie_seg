"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { SidebarDesktopNav } from "./SidebarDesktopNav";
import { SidebarMobileNav } from "./SidebarMobileNav";
import type { SidebarProps } from "./Sidebar.types";
import { useSidebarState } from "./useSidebarState";

export type { SidebarLink, SidebarProps, SpaceKey } from "./Sidebar.types";

type SidebarStateSnapshot = Pick<
  ReturnType<typeof useSidebarState>,
  | "activeMobileVisibleHref"
  | "activeVisibleHref"
  | "availableSpaces"
  | "close"
  | "currentLabel"
  | "getGroupOpen"
  | "isOpen"
  | "mobileVisibleLinks"
  | "persistOpenState"
  | "resolvedMobileSpace"
  | "setMobileSpace"
  | "toggle"
  | "toggleGroup"
  | "visibleLinks"
>;

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
  const state = useSidebarState({ links, pathname, searchParams });
  const rootClass = getRootClass(mode);
  return <SidebarContent rootClass={rootClass} mode={mode} title={title} footer={footer} mobileSpaces={mobileSpaces} pathname={pathname} searchParams={searchParams} state={state} />;
}

function SidebarMobileSection(props: ComponentProps<typeof SidebarMobileNav>) {
  return <SidebarMobileNav {...props} />;
}

function SidebarContent({
  rootClass,
  mode,
  title,
  footer,
  mobileSpaces,
  pathname,
  searchParams,
  state,
}: {
  rootClass: string;
  mode: SidebarProps["mode"];
  title: string;
  footer?: SidebarProps["footer"];
  mobileSpaces: SidebarProps["mobileSpaces"];
  pathname: string | null;
  searchParams: ReturnType<typeof useSearchParams>;
  state: SidebarStateSnapshot;
}) {
  const showMobile = mode !== "desktop";
  const showDesktop = mode !== "mobile";
  return (
    <div className={rootClass}>
      {showMobile ? <SidebarMobileSection mode={mode} title={title} isOpen={state.isOpen} currentLabel={state.currentLabel} close={state.close} toggle={state.toggle} mobileSpaces={mobileSpaces} pathname={pathname} availableSpaces={state.availableSpaces} resolvedMobileSpace={state.resolvedMobileSpace} setMobileSpace={state.setMobileSpace} persistOpenState={state.persistOpenState} mobileVisibleLinks={state.mobileVisibleLinks} activeMobileVisibleHref={state.activeMobileVisibleHref} getGroupOpen={state.getGroupOpen} toggleGroup={state.toggleGroup} searchParams={searchParams} /> : null}
      {showDesktop ? <SidebarDesktopSection state={{ visibleLinks: state.visibleLinks, activeVisibleHref: state.activeVisibleHref, pathname, searchParams, getGroupOpen: state.getGroupOpen, toggleGroup: state.toggleGroup }} /> : null}
      {showDesktop && footer ? <div className="sidebar__footer">{footer}</div> : null}
    </div>
  );
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
