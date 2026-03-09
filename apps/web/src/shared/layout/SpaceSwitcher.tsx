"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
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
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="5" width="16" height="14" rx="2.4" />
      <path d="M9 9h6M9 12h4M9 15h2" />
    </svg>
  ),
  staff: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="3" />
      <path d="M2.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="10" r="3" />
      <path d="M13.5 19q.5-3 3.5-3 3 0 3.5 3" />
    </svg>
  ),
  admin: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3.5 5.5 6v5.5c0 4.4 2.4 7.2 6.5 8.9 4.1-1.7 6.5-4.5 6.5-8.9V6L12 3.5Z" />
      <path d="m10.2 12.4 1.6 1.6 2.8-2.8" />
    </svg>
  ),
  enterprise: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 20V6.5a1.5 1.5 0 0 1 1-1.414l6-2.4a1.5 1.5 0 0 1 1 0l6 2.4A1.5 1.5 0 0 1 19 6.5V20" />
      <path d="M4 20h16M9 9h6M9 13h6M9 17h6" />
    </svg>
  ),
};

export function SpaceSwitcher({ links }: SpaceSwitcherProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const hasMountedRef = useRef(false);

  const sortedLinks = useMemo(
    () =>
      [...links].sort((a, b) => {
        const wa = SPACE_WEIGHT[a.label.toLowerCase()] ?? 99;
        const wb = SPACE_WEIGHT[b.label.toLowerCase()] ?? 99;
        if (wa !== wb) return wa - wb;
        return a.label.localeCompare(b.label);
      }),
    [links]
  );

  const activeHref = useMemo(() => {
    if (!pathname) return null;

    for (const { href, activePaths } of sortedLinks) {
      const activeByAlias = activePaths?.some((prefix) => pathname.startsWith(prefix)) ?? false;
      if (activeByAlias || pathname.startsWith(href)) return href;
    }

    return null;
  }, [pathname, sortedLinks]);

  const setIndicatorPosition = useCallback((href: string | null, animate: boolean) => {
    const indicator = indicatorRef.current;
    const nav = navRef.current;
    if (!indicator || !nav || !href) {
      indicator?.classList.remove("is-visible");
      return;
    }

    const link = linkRefs.current[href];
    if (!link) {
      indicator.classList.remove("is-visible");
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const navScaleX = nav.offsetWidth > 0 ? navRect.width / nav.offsetWidth : 1;
    const safeScaleX = Number.isFinite(navScaleX) && navScaleX > 0 ? navScaleX : 1;
    const horizontalInset = 18;
    const linkLeftInNav = (linkRect.left - navRect.left) / safeScaleX;
    const linkWidth = linkRect.width / safeScaleX;
    const left = Math.max(linkLeftInNav + horizontalInset, 0);
    const width = Math.max(linkWidth - horizontalInset * 2, 16);

    indicator.style.setProperty("--space-switcher-indicator-left", `${left}px`);
    indicator.style.setProperty("--space-switcher-indicator-width", `${width}px`);
    indicator.classList.toggle("is-animating", animate);
    indicator.classList.add("is-visible");
  }, []);

  useLayoutEffect(() => {
    if (!activeHref) {
      setIndicatorPosition(null, false);
      return;
    }

    let previousHref: string | null = null;
    try {
      previousHref = window.sessionStorage.getItem(ACTIVE_SPACE_STORAGE_KEY);
    } catch {
      previousHref = null;
    }

    const animateFromPrevious =
      !hasMountedRef.current &&
      previousHref !== null &&
      previousHref !== activeHref &&
      !!linkRefs.current[previousHref];

    if (animateFromPrevious && previousHref) {
      setIndicatorPosition(previousHref, false);
      const frameId = window.requestAnimationFrame(() => {
        setIndicatorPosition(activeHref, true);
      });
      hasMountedRef.current = true;
      try {
        window.sessionStorage.setItem(ACTIVE_SPACE_STORAGE_KEY, activeHref);
      } catch {
        // Ignore write failures.
      }
      return () => window.cancelAnimationFrame(frameId);
    }

    setIndicatorPosition(activeHref, hasMountedRef.current);
    hasMountedRef.current = true;
    try {
      window.sessionStorage.setItem(ACTIVE_SPACE_STORAGE_KEY, activeHref);
    } catch {
      // Ignore write failures.
    }
  }, [activeHref, setIndicatorPosition]);

  useEffect(() => {
    if (!activeHref) return;

    const reposition = () => setIndicatorPosition(activeHref, false);
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [activeHref, setIndicatorPosition]);

  return (
    <nav className="space-switcher" aria-label="Spaces" ref={navRef}>
      <span className="space-switcher__indicator" aria-hidden="true" ref={indicatorRef} />
      {sortedLinks.map(({ href, label, icon, activePaths }) => {
        const normalizedLabel = label.toLowerCase();
        const activeByAlias = activePaths?.some((prefix) => pathname?.startsWith(prefix) ?? false) ?? false;
        const active = pathname ? activeByAlias || pathname.startsWith(href) : false;
        const resolvedIcon = icon ?? defaultIcons[normalizedLabel];

        return (
          <Link
            key={href}
            href={href}
            className={`space-switcher__link ${active ? "is-active" : ""}`}
            aria-current={active ? "page" : undefined}
            ref={(node) => {
              linkRefs.current[href] = node;
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
      })}
    </nav>
  );
}

export type { SpaceLink };
