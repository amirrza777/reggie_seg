"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type StaffProjectBreadcrumbsProps = {
  projectId: string;
  projectName: string;
  teamNamesById: Record<string, string>;
};

type BreadcrumbItem = {
  label: string;
  href?: string;
};

const TEAM_SECTION_LABELS: Record<string, string> = {
  deadlines: "Deadlines",
  team: "Health",
  "team-meetings": "Team meetings",
  "meeting-scheduler": "Meeting scheduler",
  "peer-assessment": "Peer assessment",
  grading: "Grading",
  "peer-feedback": "Peer feedback",
  repositories: "Repositories",
  trello: "Trello",
  teamhealth: "Team health",
};

const PROJECT_SECTION_LABELS: Record<string, string> = {
  discussion: "Discussion Forum",
  "team-allocation": "Team allocation",
  trello: "Trello",
};

function toTitleCase(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildProjectSectionCrumbs(projectId: string, sectionSegments: string[]): BreadcrumbItem[] {
  if (sectionSegments.length === 0) return [];

  const [section, child] = sectionSegments;
  if (!section) return [];

  if (section === "trello") {
    const trelloRoot = `/staff/projects/${projectId}/trello`;
    const items: BreadcrumbItem[] = [{ label: PROJECT_SECTION_LABELS.trello, href: trelloRoot }];
    if (child) {
      items.push({ label: toTitleCase(child) });
    }
    return items;
  }

  return [{ label: PROJECT_SECTION_LABELS[section] ?? toTitleCase(section) }];
}

function buildTeamSectionCrumbs(basePath: string, sectionSegments: string[]): BreadcrumbItem[] {
  if (sectionSegments.length === 0) return [];

  const [section, second] = sectionSegments;
  if (!section) return [];

  if (section === "peer-assessment" || section === "peer-feedback") {
    const sectionHref = `${basePath}/${section}`;
    const items: BreadcrumbItem[] = [{ label: TEAM_SECTION_LABELS[section] ?? toTitleCase(section), href: sectionHref }];
    if (second) {
      items.push({ label: `Student ${second}` });
    }
    return items;
  }

  if (section === "trello" && second) {
    return [
      { label: TEAM_SECTION_LABELS.trello, href: `${basePath}/trello` },
      { label: toTitleCase(second) },
    ];
  }

  return [{ label: TEAM_SECTION_LABELS[section] ?? toTitleCase(section) }];
}

function buildBreadcrumbs({
  pathname,
  projectId,
  projectName,
  teamNamesById,
}: {
  pathname: string;
  projectId: string;
  projectName: string;
  teamNamesById: Record<string, string>;
}): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const baseItems: BreadcrumbItem[] = [
    { label: "Staff", href: "/staff" },
    { label: "Projects", href: "/staff/projects" },
    { label: projectName, href: `/staff/projects/${projectId}` },
  ];

  if (segments[0] !== "staff" || segments[1] !== "projects") return baseItems;
  if (segments[2] !== projectId) return baseItems;

  const afterProject = segments.slice(3);
  if (afterProject[0] === "teams" && afterProject[1]) {
    const teamId = afterProject[1];
    const teamBasePath = `/staff/projects/${projectId}/teams/${teamId}`;
    const teamLabel = teamNamesById[teamId] ?? `Team ${teamId}`;
    const sectionItems = buildTeamSectionCrumbs(teamBasePath, afterProject.slice(2));
    return [...baseItems, { label: teamLabel, href: teamBasePath }, ...sectionItems];
  }

  return [...baseItems, ...buildProjectSectionCrumbs(projectId, afterProject)];
}

export function StaffProjectBreadcrumbs({ projectId, projectName, teamNamesById }: StaffProjectBreadcrumbsProps) {
  const pathname = usePathname() ?? "";
  const crumbs = buildBreadcrumbs({ pathname, projectId, projectName, teamNamesById });

  return (
    <nav className="staff-projects__breadcrumbs" aria-label="Breadcrumb">
      <ol className="staff-projects__breadcrumb-list">
        {crumbs.map((crumb, index) => {
          const isCurrent = index === crumbs.length - 1;

          return (
            <li key={`${crumb.label}-${index}`} className="staff-projects__breadcrumb-item">
              {!isCurrent && crumb.href ? (
                <Link href={crumb.href} className="staff-projects__breadcrumb-link">
                  {crumb.label}
                </Link>
              ) : (
                <span className="staff-projects__breadcrumb-current" aria-current="page">
                  {crumb.label}
                </span>
              )}
              {!isCurrent ? <span className="staff-projects__breadcrumb-sep">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
