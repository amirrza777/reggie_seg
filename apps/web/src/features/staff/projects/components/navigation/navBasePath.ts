type MaybeModuleId = string | number | null | undefined;

function getPathSegments(pathname: string | null | undefined): string[] {
  return (pathname ?? "").split("/").filter(Boolean);
}

export function decodePathSegment(segment: string | undefined): string {
  if (!segment) {
    return "";
  }
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function inferModuleIdFromStaffProjectPath(pathname: string | null | undefined): string | null {
  const segments = getPathSegments(pathname);
  if (segments[0] !== "staff" || segments[1] !== "modules" || segments[3] !== "projects") {
    return null;
  }

  const moduleId = decodePathSegment(segments[2]);
  return moduleId ? moduleId : null;
}

export function resolveStaffProjectBasePath(options: {
  projectId: string;
  moduleId?: MaybeModuleId;
  pathname?: string | null;
}): string {
  return `/staff/projects/${encodeURIComponent(String(options.projectId))}`;
}

export function resolveStaffTeamBasePath(options: {
  projectId: string;
  teamId: string;
  moduleId?: MaybeModuleId;
  pathname?: string | null;
}): string {
  const projectBasePath = resolveStaffProjectBasePath({ projectId: String(options.projectId) });
  return `${projectBasePath}/teams/${encodeURIComponent(String(options.teamId))}`;
}
