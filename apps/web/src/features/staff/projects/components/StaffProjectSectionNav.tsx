"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isStaffNavLinkActive } from "./navLinkActive";

type StaffProjectSectionNavProps = {
  projectId: string;
};

const projectTabs = [
  { key: "overview", label: "Overview", hrefSuffix: "" },
  { key: "team-allocation", label: "Team allocation", hrefSuffix: "/team-allocation" },
  { key: "discussion", label: "Discussion Forum", hrefSuffix: "/discussion" },
];

export function StaffProjectSectionNav({ projectId }: StaffProjectSectionNavProps) {
  const pathname = usePathname();
  const base = `/staff/projects/${projectId}`;

  return (
    <nav className="pill-nav" aria-label="Project sections">
      {projectTabs.map((tab) => {
        const href = `${base}${tab.hrefSuffix}`;
        const isActive = isStaffNavLinkActive({
          pathname,
          baseHref: base,
          href,
          isOverview: tab.hrefSuffix === "",
        });

        return (
          <Link
            key={tab.key}
            href={href}
            className={`pill-nav__link${isActive ? " pill-nav__link--active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
