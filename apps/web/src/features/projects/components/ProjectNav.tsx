"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

type ProjectNavProps = {
  projectId: string;
  enabledFlags?: Record<string, boolean>;
};

export function ProjectNav({ projectId, enabledFlags }: ProjectNavProps) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const links = useMemo(
    () =>
      [
        { href: base, label: "Overview" },
        { href: `${base}/team`, label: "Team", flag: "team" },
        { href: `${base}/meetings`, label: "Meetings", flag: "meetings" },
        { href: `${base}/peer-assessments`, label: "Peer Assessment", flag: "peer_assessment" },
        { href: `${base}/peer-feedback`, label: "Peer Feedback", flag: "peer_feedback" },
        { href: `${base}/repos`, label: "Repositories", flag: "repos" },
        { href: `${base}/trello`, label: "Trello", flag: "trello" },
        { href: `${base}/discussion`, label: "Discussion Forum", flag: "discussion" },
        { href: `${base}/team-health`, label: "Team Health", flag: "team_health" },
      ].filter((link) => {
        if (link.flag && enabledFlags) {
          if (Object.prototype.hasOwnProperty.call(enabledFlags, link.flag)) {
            return enabledFlags[link.flag] === true;
          }
          return true;
        }
        return true;
      }),
    [base, enabledFlags],
  );

  return (
    <nav className="pill-nav">
      {links.map((link) => {
        const isActive = link.href === base
          ? pathname === base
          : pathname === link.href || pathname?.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`pill-nav__link${isActive ? " pill-nav__link--active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
