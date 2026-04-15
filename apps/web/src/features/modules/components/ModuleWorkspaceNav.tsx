"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ModuleWorkspaceNavProps = {
  moduleId: string;
  /** e.g. `/staff/modules` for staff workspace */
  basePath: string;
  showSettingsLink?: boolean;  // false = hides the Settings tab (TAs).

};

const navLabel = "Module sections";

export function ModuleWorkspaceNav({ moduleId, basePath, showSettingsLink = true }: ModuleWorkspaceNavProps) {
  const pathname = usePathname();
  const enc = encodeURIComponent(moduleId);
  const root = basePath.replace(/\/$/, "");
  const base = `${root}/${enc}`;

  const allLinks: { href: string; label: string; match: (path: string | null) => boolean }[] = [
    {
      href: base,
      label: "Overview",
      match: (path) => path === base,
    },
    {
      href: `${base}/projects`,
      label: "Projects",
      match: (path) => path === `${base}/projects` || Boolean(path?.startsWith(`${base}/projects/`)),
    },
    {
      href: `${base}/staff`,
      label: "Staff Members",
      match: (path) => path === `${base}/staff` || Boolean(path?.startsWith(`${base}/staff/`)),
    },
    {
      href: `${base}/students`,
      label: "Student Members",
      match: (path) => path === `${base}/students` || Boolean(path?.startsWith(`${base}/students/`)),
    },
    {
      href: `${base}/manage`,
      label: "Settings",
      match: (path) => path === `${base}/manage` || Boolean(path?.startsWith(`${base}/manage/`)),
    },
  ];

  const links = showSettingsLink ? allLinks : allLinks.filter((link) => link.label !== "Settings");

  return (
    <nav className="pill-nav module-workspace__tabs" aria-label={navLabel}>
      {links.map((link) => {
        const isActive = link.match(pathname);
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
