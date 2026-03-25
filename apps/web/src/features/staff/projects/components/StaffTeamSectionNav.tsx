"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type StaffTeamSectionNavProps = {
  projectId: string;
  teamId: string;
};

const teamTabs = [
  { key: "overview", label: "Overview", hrefSuffix: "" },
  { key: "deadlines", label: "Deadlines", hrefSuffix: "/deadlines" },
  { key: "team", label: "Team", hrefSuffix: "/team" },
  { key: "team-meetings", label: "Team meetings", hrefSuffix: "/team-meetings" },
  { key: "repositories", label: "Repositories", hrefSuffix: "/repositories" },
  { key: "trello", label: "Trello", hrefSuffix: "/trello" },
  { key: "peer-assessment", label: "Peer assessment", hrefSuffix: "/peer-assessment" },
  { key: "grading", label: "Grading", hrefSuffix: "/grading" },
];

export function StaffTeamSectionNav({ projectId, teamId }: StaffTeamSectionNavProps) {
  const pathname = usePathname();
  const base = `/staff/projects/${projectId}/teams/${teamId}`;

  return (
    <nav className="pill-nav" aria-label="Team sections">
      {teamTabs.map((tab) => {
        const href = `${base}${tab.hrefSuffix}`;
        const isOverview = tab.hrefSuffix === "";
        const isActive = isOverview
          ? pathname === base
          : pathname === href || pathname?.startsWith(`${href}/`);

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
