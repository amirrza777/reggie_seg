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
  { key: "team-meetings", label: "Meetings", hrefSuffix: "/team-meetings" },
  { key: "peer-assessment", label: "Peer assessment", hrefSuffix: "/peer-assessment" },
  { key: "grading", label: "Grading", hrefSuffix: "/grading" },
  { key: "peer-feedback", label: "Peer feedback", hrefSuffix: "/peer-feedback" },
  { key: "repositories", label: "Repositories", hrefSuffix: "/repositories" },
  { key: "trello", label: "Trello", hrefSuffix: "/trello" },
  { key: "team-health", label: "Team health", hrefSuffix: "/teamhealth" },
];

export function StaffTeamSectionNav({ projectId, teamId }: StaffTeamSectionNavProps) {
  const pathname = usePathname();
  const base = `/staff/projects/${projectId}/teams/${teamId}`;

  return (
    <nav className="pill-nav" aria-label="Team sections">
      {teamTabs.map((tab) => {
        const href = `${base}${tab.hrefSuffix}`;
        const isOverview = tab.hrefSuffix === "";
        const isTeamHealth = tab.key === "team-health";
        const legacyTeamHealthHref = `${base}/team`;
        const isActive = isOverview
          ? pathname === base
          : pathname === href ||
            pathname?.startsWith(`${href}/`) ||
            (isTeamHealth &&
              (pathname === legacyTeamHealthHref || pathname?.startsWith(`${legacyTeamHealthHref}/`)));

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
