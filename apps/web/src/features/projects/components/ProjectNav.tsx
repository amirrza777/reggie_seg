"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type ProjectNavProps = {
  projectId: string;
};

export function ProjectNav({ projectId }: ProjectNavProps) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const links = [
    { href: base, label: "Overview" },
    { href: `${base}/team`, label: "Team" },
    { href: `${base}/meetings`, label: "Team meetings" },
    { href: `${base}/meeting-scheduler`, label: "Meeting scheduler" },
    { href: `${base}/peer-assessments`, label: "Peer assessment" },
    { href: `${base}/peer-feedback`, label: "Peer feedback" },
    { href: `${base}/repos`, label: "Repos" },
  ];

  return (
    <nav className="pill-nav">
      {links.map((link) => {
        const isActive = link.href === base
          ? pathname === base
          : pathname?.startsWith(link.href);
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
