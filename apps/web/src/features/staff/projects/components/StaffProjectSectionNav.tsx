"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isStaffNavLinkActive } from "./navLinkActive";
import { resolveStaffProjectBasePath } from "./navBasePath";

type StaffProjectSectionNavProps = {
  projectId: string;
  moduleId?: string | number | null;
  canManageProjectSettings?: boolean;
};

const projectTabsBase = [
  { key: "overview", label: "Overview", hrefSuffix: "" },
  { key: "team-allocation", label: "Team allocation", hrefSuffix: "/team-allocation" },
  { key: "meetings", label: "Meetings", hrefSuffix: "/meetings" },
  { key: "peer-assessments", label: "Peer assessments", hrefSuffix: "/peer-assessments" },
  { key: "discussion", label: "Discussion Forum", hrefSuffix: "/discussion" },
  { key: "warnings", label: "Warnings", hrefSuffix: "/warnings" },
  { key: "manage", label: "Manage", hrefSuffix: "/manage" },
] as const;

export function StaffProjectSectionNav({
  projectId,
  moduleId,
  canManageProjectSettings,
}: StaffProjectSectionNavProps) {
  const pathname = usePathname();
  const base = resolveStaffProjectBasePath({ projectId, moduleId, pathname });

  const projectTabs = projectTabsBase.filter(
    (tab) => tab.key !== "manage" || canManageProjectSettings === true,
  );

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
