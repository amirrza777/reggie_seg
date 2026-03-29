"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isStaffNavLinkActive } from "./navLinkActive";
import { resolveStaffTeamBasePath } from "./navBasePath";

type StaffTeamSectionNavProps = {
  projectId: string;
  teamId: string;
  moduleId?: string | number | null;
};

const teamTabs = [
  { key: "overview", label: "Overview", hrefSuffix: "" },
  { key: "deadlines", label: "Deadlines", hrefSuffix: "/deadlines" },
  { key: "team", label: "Health", hrefSuffix: "/team" },
  { key: "team-meetings", label: "Team meetings", hrefSuffix: "/team-meetings" },
  { key: "peer-assessment", label: "Peer assessment", hrefSuffix: "/peer-assessment" },
  { key: "repositories", label: "Repositories", hrefSuffix: "/repositories" },
  { key: "trello", label: "Trello", hrefSuffix: "/trello" },
  { key: "grading", label: "Marking", hrefSuffix: "/grading" },
];

export function StaffTeamSectionNav({ projectId, teamId, moduleId }: StaffTeamSectionNavProps) {
  const pathname = usePathname();
  const base = resolveStaffTeamBasePath({ projectId, teamId, moduleId, pathname });

  return (
    <nav className="pill-nav" aria-label="Team sections">
      {teamTabs.map((tab) => {
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
