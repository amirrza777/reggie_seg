"use client";

import { usePathname } from "next/navigation";
import type { BreadcrumbItem } from "@/shared/layout/Breadcrumbs";
import { StaffBreadcrumbs } from "@/shared/layout/StaffBreadcrumbs";

type StaffModuleWorkspaceBreadcrumbsProps = {
  moduleId: string;
  moduleTitle: string;
};

const SECTION_LABELS: Record<string, string> = {
  marks: "Marks",
  projects: "Projects",
  staff: "Staff members",
  students: "Student members",
  manage: "Settings",
};

const SUBSECTION_LABELS: Record<string, string> = {
  access: "Access",
};

function toTitleCase(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function decodePathSegment(segment: string | undefined): string {
  if (!segment) {return "";}
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function buildCrumbs(pathname: string, moduleId: string, moduleTitle: string): BreadcrumbItem[] {
  const encodedModuleId = encodeURIComponent(moduleId);
  const moduleRoot = `/staff/modules/${encodedModuleId}`;
  const segments = pathname.split("/").filter(Boolean);

  const base: BreadcrumbItem[] = [
    { label: "Staff", href: "/staff" },
    { label: "My Modules", href: "/staff/modules" },
    { label: moduleTitle, href: moduleRoot },
  ];

  if (segments[0] !== "staff" || segments[1] !== "modules") {return base;}
  if (decodePathSegment(segments[2]) !== moduleId) {return base;}

  const section = segments[3];
  if (!section) {
    return [
      { label: "Staff", href: "/staff" },
      { label: "My Modules", href: "/staff/modules" },
      { label: moduleTitle },
    ];
  }

  const sectionHref = `${moduleRoot}/${section}`;
  const sectionLabel = SECTION_LABELS[section] ?? toTitleCase(section);
  const sectionCrumb: BreadcrumbItem = { label: sectionLabel, href: sectionHref };

  const child = segments[4];
  if (!child) {return [...base, { label: sectionLabel }];}

  return [
    ...base,
    sectionCrumb,
    { label: SUBSECTION_LABELS[child] ?? toTitleCase(child) },
  ];
}

export function StaffModuleWorkspaceBreadcrumbs({ moduleId, moduleTitle }: StaffModuleWorkspaceBreadcrumbsProps) {
  const pathname = usePathname() ?? "";
  const crumbs = buildCrumbs(pathname, moduleId, moduleTitle);
  return <StaffBreadcrumbs items={crumbs} />;
}
