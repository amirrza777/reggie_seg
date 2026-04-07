"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SpaceLink = {
  href: string;
  label: string;
  icon?: ReactNode;
  activePaths?: string[];
};

type SpaceSwitcherProps = {
  links: SpaceLink[];
};

const ACTIVE_SPACE_STORAGE_KEY = "team-feedback.space-switcher.active";
const SPACE_WEIGHT: Record<string, number> = {
  admin: 1,
  workspace: 2,
  staff: 3,
  enterprise: 4,
};

const defaultIcons: Record<string, ReactNode> = {
  workspace: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="14" rx="2.4" />
      <path d="M9 9h6M9 12h4M9 15h2" />
    </svg>
  ),
  staff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M2.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="10" r="3" />
      <path d="M13.5 19q.5-3 3.5-3 3 0 3.5 3" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5 5.5 6v5.5c0 4.4 2.4 7.2 6.5 8.9 4.1-1.7 6.5-4.5 6.5-8.9V6L12 3.5Z" />
      <path d="m10.2 12.4 1.6 1.6 2.8-2.8" />
    </svg>
  ),
  enterprise: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V6.5a1.5 1.5 0 0 1 1-1.414l6-2.4a1.5 1.5 0 0 1 1 0l6 2.4A1.5 1.5 0 0 1 19 6.5V20" />
      <path d="M4 20h16M9 9h6M9 13h6M9 17h6" />
    </svg>
  ),
};

export function SpaceSwitcher({ links }: SpaceSwitcherProps) {
  const pathname = usePathname();
  const sortedLinks = useMemo(() => sortSpaceLinks(links), [links]);
  const activeHref = useMemo(() => getActiveSpaceHref(pathname, sortedLinks), [pathname, sortedLinks]);
  const { navRef, indicatorRef, registerLinkRef } = useSpaceSwitcherIndicator(activeHref);

  return (
    <nav className="space-switcher" aria-label="Spaces" ref={navRef}>
      <span className="space-switcher__indicator" aria-hidden="true" ref={indicatorRef} />
      <SpaceSwitcherLinks links={sortedLinks} pathname={pathname} onLinkRef={registerLinkRef} />
    </nav>
  );
}

function SpaceSwitcherLinks({
  links,
  pathname,
  onLinkRef,
}: {
  links: SpaceLink[];
  pathname: string | null;
  onLinkRef: (href: string, node: HTMLAnchorElement | null) => void;
}) {
  return (
    <>
      {links.map((link) => (
        <SpaceSwitcherLinkItem key={link.href} link={link} pathname={pathname} onLinkRef={onLinkRef} />
      ))}
    </>
  );
}

function SpaceSwitcherLinkItem({
  link,
  pathname,
  onLinkRef,
}: {
  link: SpaceLink;
  pathname: string | null;
  onLinkRef: (href: string, node: HTMLAnchorElement | null) => void;
}) {
  const { href, label, icon, activePaths } = link;
  const active = isSpaceLinkActive(pathname, href, activePaths);
  const resolvedIcon = icon ?? defaultIcons[label.toLowerCase()];

  return (
    <Link
      href={href}
      className={`space-switcher__link ${active ? "is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      ref={(node) => {
        onLinkRef(href, node);
      }}
    >
      {resolvedIcon ? (
        <span className="space-switcher__icon" aria-hidden="true">
          {resolvedIcon}
        </span>
      ) : null}
      <span className="space-switcher__label">{label}</span>
    </Link>
  );
}

function useSpaceSwitcherIndicator(activeHref: string | null) {
  const navRef = useRef<HTMLElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const hasMountedRef = useRef(false);
  const registerLinkRef = useCallback((href: string, node: HTMLAnchorElement | null) => {
    linkRefs.current[href] = node;
  }, []);

  const setIndicatorPosition = useCallback((href: string | null, animate: boolean) => {
    updateIndicatorPosition({ href, animate, nav: navRef.current, indicator: indicatorRef.current, linkRefs: linkRefs.current });
  }, []);

  useIndicatorLayoutSync({ activeHref, setIndicatorPosition, hasMountedRef, linkRefs });
  useIndicatorResizeSync({ activeHref, setIndicatorPosition });

  return { navRef, indicatorRef, registerLinkRef };
}

function useIndicatorLayoutSync(params: {
  activeHref: string | null;
  setIndicatorPosition: (href: string | null, animate: boolean) => void;
  hasMountedRef: MutableRefObject<boolean>;
  linkRefs: MutableRefObject<Record<string, HTMLAnchorElement | null>>;
}) {
  const { activeHref, setIndicatorPosition, hasMountedRef, linkRefs } = params;

  useLayoutEffect(() => {
    if (!activeHref) {
      setIndicatorPosition(null, false);
      return;
    }

    const transitionFrameId = animateInitialIndicatorTransition({ activeHref, setIndicatorPosition, hasMountedRef, linkRefs });
    if (transitionFrameId === null) {
      setIndicatorPosition(activeHref, hasMountedRef.current);
    }

    hasMountedRef.current = true;
    persistActiveHref(activeHref);

    if (transitionFrameId === null) {
      return;
    }

    return () => window.cancelAnimationFrame(transitionFrameId);
  }, [activeHref, hasMountedRef, linkRefs, setIndicatorPosition]);
}

function useIndicatorResizeSync(params: {
  activeHref: string | null;
  setIndicatorPosition: (href: string | null, animate: boolean) => void;
}) {
  const { activeHref, setIndicatorPosition } = params;

  useEffect(() => {
    if (!activeHref) {
      return;
    }

    const reposition = () => setIndicatorPosition(activeHref, false);
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [activeHref, setIndicatorPosition]);
}

function animateInitialIndicatorTransition(params: {
  activeHref: string;
  setIndicatorPosition: (href: string | null, animate: boolean) => void;
  hasMountedRef: MutableRefObject<boolean>;
  linkRefs: MutableRefObject<Record<string, HTMLAnchorElement | null>>;
}): number | null {
  const { activeHref, setIndicatorPosition, hasMountedRef, linkRefs } = params;
  const previousHref = readPersistedActiveHref();
  const shouldAnimate = shouldAnimateFromPreviousHref({
    hasMounted: hasMountedRef.current,
    previousHref,
    activeHref,
    hasPreviousLink: previousHref ? Boolean(linkRefs.current[previousHref]) : false,
  });

  if (!shouldAnimate || !previousHref) {
    return null;
  }

  setIndicatorPosition(previousHref, false);
  return window.requestAnimationFrame(() => {
    setIndicatorPosition(activeHref, true);
  });
}

function updateIndicatorPosition(params: {
  href: string | null;
  animate: boolean;
  nav: HTMLElement | null;
  indicator: HTMLSpanElement | null;
  linkRefs: Record<string, HTMLAnchorElement | null>;
}) {
  if (!params.indicator || !params.nav || !params.href) {
    params.indicator?.classList.remove("is-visible");
    return;
  }

  const link = params.linkRefs[params.href];
  if (!link) {
    params.indicator.classList.remove("is-visible");
    return;
  }

  const navRect = params.nav.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();
  const navScaleX = params.nav.offsetWidth > 0 ? navRect.width / params.nav.offsetWidth : 1;
  const safeScaleX = Number.isFinite(navScaleX) && navScaleX > 0 ? navScaleX : 1;
  const horizontalInset = 18;
  const linkLeftInNav = (linkRect.left - navRect.left) / safeScaleX;
  const linkWidth = linkRect.width / safeScaleX;
  const left = Math.max(linkLeftInNav + horizontalInset, 0);
  const width = Math.max(linkWidth - horizontalInset * 2, 16);

  params.indicator.style.setProperty("--space-switcher-indicator-left", `${left}px`);
  params.indicator.style.setProperty("--space-switcher-indicator-width", `${width}px`);
  params.indicator.classList.toggle("is-animating", params.animate);
  params.indicator.classList.add("is-visible");
}

export type { SpaceLink };

function sortSpaceLinks(links: SpaceLink[]): SpaceLink[] {
  return [...links].sort((a, b) => {
    const wa = SPACE_WEIGHT[a.label.toLowerCase()] ?? 99;
    const wb = SPACE_WEIGHT[b.label.toLowerCase()] ?? 99;
    if (wa !== wb) {
      return wa - wb;
    }
    return a.label.localeCompare(b.label);
  });
}

function getActiveSpaceHref(pathname: string | null, links: SpaceLink[]): string | null {
  if (!pathname) {
    return null;
  }
  for (const link of links) {
    if (isSpaceLinkActive(pathname, link.href, link.activePaths)) {
      return link.href;
    }
  }
  return null;
}

function isSpaceLinkActive(pathname: string | null, href: string, activePaths?: string[]): boolean {
  if (!pathname) {
    return false;
  }
  const activeByAlias = activePaths?.some((prefix) => pathname.startsWith(prefix)) ?? false;
  return activeByAlias || pathname.startsWith(href);
}

function readPersistedActiveHref(): string | null {
  try {
    return window.sessionStorage.getItem(ACTIVE_SPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistActiveHref(activeHref: string) {
  try {
    window.sessionStorage.setItem(ACTIVE_SPACE_STORAGE_KEY, activeHref);
  } catch {
    // Ignore write failures.
  }
}

function shouldAnimateFromPreviousHref(params: {
  hasMounted: boolean;
  previousHref: string | null;
  activeHref: string;
  hasPreviousLink: boolean;
}): boolean {
  if (params.hasMounted) {
    return false;
  }
  if (!params.previousHref) {
    return false;
  }
  if (params.previousHref === params.activeHref) {
    return false;
  }
  return params.hasPreviousLink;
}
