"use client";

import { usePathname } from "next/navigation";
import type { BreadcrumbItem } from "@/shared/layout/Breadcrumbs";
import { StaffBreadcrumbs } from "@/shared/layout/StaffBreadcrumbs";
import { decodePathSegment, inferModuleIdFromStaffProjectPath, resolveStaffProjectBasePath } from "./navBasePath";

type StaffProjectBreadcrumbsProps = {
  projectId: string;
  projectName: string;
  teamNamesById: Record<string, string>;
  moduleId?: string | number | null;
  moduleName?: string | null;
};

type BreadcrumbContext = {
  pathname: string;
  segments: string[];
  projectId: string;
  projectName: string;
  projectBasePath: string;
  teamNamesById: Record<string, string>;
  projectsIndexHref: string;
  encodedModuleId: string | null;
  moduleLabel: string;
};

const TEAM_SECTION_LABELS: Record<string, string> = {
  deadlines: "Deadlines",
  team: "Health",
  "team-meetings": "Team meetings",
  "meeting-scheduler": "Meeting scheduler",
  "peer-assessment": "Peer assessment",
  grading: "Marking",
  "peer-feedback": "Peer feedback",
  repositories: "Repositories",
  trello: "Trello",
  teamhealth: "Team health",
};

const PROJECT_SECTION_LABELS: Record<string, string> = {
  discussion: "Discussion Forum",
  meetings: "Meetings",
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

function isLegacyOrModuleProjectRoute(segments: string[]) {
  const isLegacyProjectRoute = segments[0] === "staff" && segments[1] === "projects";
  const isModuleProjectRoute = segments[0] === "staff" && segments[1] === "modules" && segments[3] === "projects";
  return { isLegacyProjectRoute, isModuleProjectRoute };
}

function resolveProjectRouteSegments(segments: string[]) {
  const { isLegacyProjectRoute, isModuleProjectRoute } = isLegacyOrModuleProjectRoute(segments);
  if (!isLegacyProjectRoute && !isModuleProjectRoute) {
    return null;
  }
  return {
    projectSegment: isModuleProjectRoute ? segments[4] : segments[2],
    afterProject: segments.slice(isModuleProjectRoute ? 5 : 3),
  };
}

function buildProjectSectionCrumbs(basePath: string, sectionSegments: string[]): BreadcrumbItem[] {
  if (sectionSegments.length === 0) {
    return [];
  }
  const [section, child] = sectionSegments;
  if (!section) {
    return [];
  }
  if (section === "trello") {
    const trelloRoot = `${basePath}/trello`;
    const items: BreadcrumbItem[] = [{ label: PROJECT_SECTION_LABELS.trello, href: trelloRoot }];
    if (child) {
      items.push({ label: toTitleCase(child) });
    }
    return items;
  }
  return [{ label: PROJECT_SECTION_LABELS[section] ?? toTitleCase(section) }];
}

function buildTeamSectionCrumbs(basePath: string, sectionSegments: string[]): BreadcrumbItem[] {
  if (sectionSegments.length === 0) {
    return [];
  }
  const [section, second] = sectionSegments;
  if (!section) {
    return [];
  }
  if (section === "peer-assessment" || section === "peer-feedback") {
    const sectionHref = `${basePath}/${section}`;
    const sectionLabel = TEAM_SECTION_LABELS[section] ?? toTitleCase(section);
    const items: BreadcrumbItem[] = [{ label: sectionLabel, href: sectionHref }];
    if (second) {
      items.push({ label: `Student ${decodePathSegment(second)}` });
    }
    return items;
  }
  if (section === "trello" && second) {
    return [{ label: TEAM_SECTION_LABELS.trello, href: `${basePath}/trello` }, { label: toTitleCase(second) }];
  }
  return [{ label: TEAM_SECTION_LABELS[section] ?? toTitleCase(section) }];
}

function buildBaseBreadcrumbItems(context: BreadcrumbContext): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: "Staff", href: "/staff" }, { label: "My Modules", href: "/staff/modules" }];
  if (context.encodedModuleId) {
    items.push({ label: context.moduleLabel, href: `/staff/modules/${context.encodedModuleId}` });
  }
  items.push({ label: "Projects", href: context.projectsIndexHref }, { label: context.projectName, href: context.projectBasePath });
  return items;
}

function buildTeamBreadcrumbItems(context: BreadcrumbContext, afterProject: string[]): BreadcrumbItem[] {
  const teamSegment = afterProject[1];
  if (afterProject[0] !== "teams" || !teamSegment) {
    return [];
  }
  const teamId = decodePathSegment(teamSegment);
  const teamBasePath = `${context.projectBasePath}/teams/${encodeURIComponent(teamId)}`;
  const teamLabel = context.teamNamesById[teamId] ?? `Team ${teamId}`;
  const sectionItems = buildTeamSectionCrumbs(teamBasePath, afterProject.slice(2));
  return [{ label: teamLabel, href: teamBasePath }, ...sectionItems];
}

function buildBreadcrumbContext(props: StaffProjectBreadcrumbsProps, pathname: string): BreadcrumbContext {
  const segments = pathname.split("/").filter(Boolean);
  const moduleIdFromPath = inferModuleIdFromStaffProjectPath(pathname);
  const fallbackModuleId = props.moduleId == null || String(props.moduleId).trim().length === 0 ? null : String(props.moduleId);
  const resolvedModuleId = moduleIdFromPath ?? fallbackModuleId;
  const projectBasePath = resolveStaffProjectBasePath({
    projectId: props.projectId,
    moduleId: resolvedModuleId,
    pathname: moduleIdFromPath ? pathname : null,
  });
  const encodedModuleId = resolvedModuleId ? encodeURIComponent(resolvedModuleId) : null;
  const projectsIndexHref = encodedModuleId ? `/staff/modules/${encodedModuleId}/projects` : "/staff/projects";
  const moduleLabel = props.moduleName?.trim() || (resolvedModuleId ? `Module ${resolvedModuleId}` : "Module");
  return { pathname, segments, projectId: props.projectId, projectName: props.projectName, projectBasePath, teamNamesById: props.teamNamesById, projectsIndexHref, encodedModuleId, moduleLabel };
}

function buildBreadcrumbs(context: BreadcrumbContext): BreadcrumbItem[] {
  const baseItems = buildBaseBreadcrumbItems(context);
  const routeSegments = resolveProjectRouteSegments(context.segments);
  if (!routeSegments) {
    return baseItems;
  }
  const projectSegmentId = decodePathSegment(routeSegments.projectSegment);
  if (projectSegmentId !== context.projectId) {
    return baseItems;
  }
  const teamItems = buildTeamBreadcrumbItems(context, routeSegments.afterProject);
  if (teamItems.length > 0) {
    return [...baseItems, ...teamItems];
  }
  return [...baseItems, ...buildProjectSectionCrumbs(context.projectBasePath, routeSegments.afterProject)];
}

export function StaffProjectBreadcrumbs(props: StaffProjectBreadcrumbsProps) {
  const pathname = usePathname() ?? "";
  const context = buildBreadcrumbContext(props, pathname);
  const crumbs = buildBreadcrumbs(context);
  return <StaffBreadcrumbs items={crumbs} />;
}
