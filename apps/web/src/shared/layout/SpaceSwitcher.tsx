"use client";

import type { ReactNode } from "react";
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
};

export function SpaceSwitcher({ links }: SpaceSwitcherProps) {
  const pathname = usePathname();

  return (
    <nav className="space-switcher" aria-label="Spaces">
      {links.map(({ href, label, icon, activePaths }) => {
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
