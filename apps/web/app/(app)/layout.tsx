import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/shared/layout/AppShell";
import { NavigationPrefetch } from "@/shared/layout/NavigationPrefetch";
import { Sidebar } from "@/shared/layout/Sidebar";
import { Topbar } from "@/shared/layout/Topbar";
import { SpaceSwitcher, type SpaceLink } from "@/shared/layout/SpaceSwitcher";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { listModules } from "@/features/modules/api/client";
import { getUserProjects } from "@/features/projects/api/client";
import { getCurrentUser, isAdmin, isEnterpriseAdmin, isModuleScopedStaff } from "@/shared/auth/session";
import { getDefaultSpaceOverviewPath } from "@/shared/auth/default-space";
import { getFeatureFlagMap } from "@/shared/featureFlags";
import { logDevError } from "@/shared/lib/devLogger";
import "../styles/global-app-shell.css";

export const dynamic = "force-dynamic";

type NavChild = {
  href: string;
  label: string;
  flag?: string;
};

type NavLink = {
  href: string;
  label: string;
  space: "workspace" | "staff" | "enterprise" | "admin";
  flag?: string;
  children?: NavChild[];
  defaultExpanded?: boolean;
};

type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

const moduleScopedStaffLinks = new Set([
  "/staff/dashboard",
  "/staff/modules",
  "/staff/marks",
  "/staff/questionnaires",
  "/staff/archive",
]);

const workspaceAliases = ["/dashboard", "/modules", "/projects", "/calendar"];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [user, flagMap] = await Promise.all([getCurrentUser(), getFeatureFlagMap()]);
  if (!user) redirect("/login");
  if (user.suspended === true || user.active === false) return renderSuspendedAccountView();
  if (user.needsEnterpriseCode === true) redirect("/google/enterprise-code");
  if (user.isUnassigned === true) return renderUnassignedAccountView(children);

  const navChildren = await loadNavChildrenData(user.id);

  const navData = buildLayoutNavigationData({
    user,
    flagMap,
    modules: navChildren.modules,
    projects: navChildren.projects,
  });
  const prefetchHrefs = buildPrefetchHrefs(navData);

  return (
    <AppShell
      sidebar={<Sidebar title="Workspace sections" links={navData.accessibleLinks} mode="desktop" />}
      topbar={
        <Topbar
          leading={<Sidebar title="Navigate" links={navData.accessibleLinks} mode="mobile" mobileSpaces={navData.spaceLinks} />}
          title="Team Feedback"
          titleHref={navData.defaultSpaceHref}
          actions={<UserMenu />}
        />
      }
      ribbon={navData.spaceLinks.length > 0 ? <SpaceSwitcher links={navData.spaceLinks} /> : null}
    >
      <>
        <NavigationPrefetch hrefs={prefetchHrefs} />
        <div className="workspace-shell">{children}</div>
      </>
    </AppShell>
  );
}

function renderSuspendedAccountView() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24 }}>
      <div className="card" style={{ maxWidth: 520, textAlign: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Account suspended</h2>
        <p className="muted" style={{ margin: 0 }}>
          Your account has been suspended by an administrator. Please contact support or your admin to restore access.
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <a href="/login" className="btn btn--primary">
            Return to login
          </a>
        </div>
      </div>
    </main>
  );
}

function renderUnassignedAccountView(children: ReactNode) {
  return (
    <AppShell
      topbar={
        <Topbar
          title="Team Feedback"
          titleHref="/dashboard"
          actions={<UserMenu />}
        />
      }
    >
      <div className="workspace-shell workspace-shell--unassigned">
        {children}
      </div>
    </AppShell>
  );
}

function buildLayoutNavigationData(params: {
  user: AuthenticatedUser;
  flagMap: Record<string, boolean>;
  modules: Awaited<ReturnType<typeof listModules>> | null;
  projects: Awaited<ReturnType<typeof getUserProjects>> | null;
}) {
  const moduleChildren = buildModuleChildren(params.modules);
  const projectChildren = buildProjectChildren(params.projects);
  const projectsDefaultExpanded = shouldDefaultExpandProjects(params.projects);
  const navLinks = buildBaseNavLinks(moduleChildren, projectChildren, projectsDefaultExpanded);
  const accessibleLinks = filterAccessibleNavLinks(navLinks, params.user, params.flagMap);
  const spaceLinks = buildSpaceLinks(params.user);
  const defaultSpaceHref = getDefaultSpaceOverviewPath(params.user);

  return { accessibleLinks, spaceLinks, defaultSpaceHref };
}

function buildPrefetchHrefs(navData: {
  accessibleLinks: ReturnType<typeof buildLayoutNavigationData>["accessibleLinks"];
  spaceLinks: SpaceLink[];
  defaultSpaceHref: string;
}) {
  const queue = [
    navData.defaultSpaceHref,
    ...navData.spaceLinks.map((link) => link.href),
    ...navData.accessibleLinks.map((link) => link.href),
    ...navData.accessibleLinks.flatMap((link) => (link.children?.length ? [link.children[0].href] : [])),
  ];

  return Array.from(new Set(queue));
}

function buildModuleChildren(modules: Awaited<ReturnType<typeof listModules>> | null) {
  const base: NonNullable<NavLink["children"]> = [{ href: "/dashboard", label: "Overview" }];
  if (!modules || modules.length === 0) return base;

  return [
    ...base,
    ...modules.map((module) => ({
      href: `/modules/${encodeURIComponent(module.id)}`,
      label: module.title,
    })),
  ];
}

function buildProjectChildren(projects: Awaited<ReturnType<typeof getUserProjects>> | null) {
  const base: NonNullable<NavLink["children"]> = [{ href: "/projects", label: "All projects" }];
  if (!projects) return base;

  return [
    ...base,
    ...projects.map((project) => ({
      href: `/projects/${project.id}`,
      label: project.name,
    })),
  ];
}

async function loadNavChildrenData(userId: number): Promise<{
  modules: Awaited<ReturnType<typeof listModules>> | null;
  projects: Awaited<ReturnType<typeof getUserProjects>> | null;
}> {
  const [modulesResult, projectsResult] = await Promise.allSettled([
    listModules(userId, { compact: true }),
    getUserProjects(userId),
  ]);

  if (modulesResult.status === "rejected") {
    logDevError("Failed to load module navigation children", modulesResult.reason);
  }
  if (projectsResult.status === "rejected") {
    logDevError("Failed to load project navigation children", projectsResult.reason);
  }

  return {
    modules: modulesResult.status === "fulfilled" ? modulesResult.value : null,
    projects: projectsResult.status === "fulfilled" ? projectsResult.value : null,
  };
}

function buildBaseNavLinks(
  moduleChildren: NonNullable<NavLink["children"]>,
  projectChildren: NonNullable<NavLink["children"]>,
  projectsDefaultExpanded: boolean
): NavLink[] {
  return [
    { href: "/dashboard", label: "Modules", space: "workspace", children: moduleChildren },
    {
      href: "/projects",
      label: "Projects",
      space: "workspace",
      children: projectChildren,
      defaultExpanded: projectsDefaultExpanded,
    },
    { href: "/calendar", label: "Calendar", space: "workspace" },
    { href: "/staff/dashboard", label: "Staff Overview", space: "staff" },
    { href: "/staff/modules", label: "My Modules", space: "staff" },
    { href: "/staff/marks", label: "Marking", space: "staff" },
    { href: "/staff/questionnaires", label: "Questionnaires", space: "staff" },
    { href: "/staff/archive", label: "Archive", space: "staff" },
    { href: "/admin", label: "Admin Home", space: "admin" },
  ];
}

function shouldDefaultExpandProjects(projects: Awaited<ReturnType<typeof getUserProjects>> | null) {
  if (!projects) return true;
  return projects.length <= 7;
}

function filterAccessibleNavLinks(navLinks: NavLink[], user: AuthenticatedUser, flagMap: Record<string, boolean>) {
  const limitedStaffUser = isModuleScopedStaff(user);
  const isStaffOnlyAccount = user.isStaff && !isAdmin(user) && !isEnterpriseAdmin(user);

  return navLinks
    .filter((link) => {
      if (link.flag && flagMap[link.flag] === false) return false;
      if (link.space === "workspace" && isStaffOnlyAccount) return false;
      if (link.space === "staff") {
        if (!(user.isStaff || isAdmin(user))) return false;
        if (limitedStaffUser && !moduleScopedStaffLinks.has(link.href)) return false;
      }
      if (link.space === "admin" && !isAdmin(user)) return false;
      return true;
    })
    .map((link) => ({
      ...link,
      children: link.children?.filter((child) => !child.flag || flagMap[child.flag] !== false),
    }));
}

function buildSpaceLinks(user: AuthenticatedUser): SpaceLink[] {
  const links: SpaceLink[] = [];
  const isStaffOnlyAccount = user.isStaff && !isAdmin(user) && !isEnterpriseAdmin(user);
  const profileSpaceHref = getDefaultSpaceOverviewPath(user);

  if (!isStaffOnlyAccount) {
    links.push({
      href: "/dashboard",
      label: "Workspace",
      activePaths: appendProfileAlias(workspaceAliases, profileSpaceHref === "/dashboard"),
    });
  }
  if (user.isStaff || isAdmin(user)) {
    links.push({
      href: "/staff/dashboard",
      label: "Staff",
      activePaths: appendProfileAlias(["/staff"], profileSpaceHref === "/staff/dashboard"),
    });
  }
  if (isEnterpriseAdmin(user) || isAdmin(user)) {
    links.push({
      href: "/enterprise",
      label: "Enterprise",
      activePaths: appendProfileAlias(["/enterprise"], profileSpaceHref === "/enterprise"),
    });
  }
  if (isAdmin(user)) {
    links.push({
      href: "/admin",
      label: "Admin",
      activePaths: appendProfileAlias(["/admin"], profileSpaceHref === "/admin"),
    });
  }

  return links;
}

function appendProfileAlias(activePaths: string[], includeProfileAlias: boolean) {
  if (!includeProfileAlias) {
    return activePaths;
  }
  return [...activePaths, "/profile"];
}