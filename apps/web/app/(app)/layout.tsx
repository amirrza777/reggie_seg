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
};

type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

const moduleScopedStaffLinks = new Set([
  "/staff/dashboard",
  "/staff/modules",
  "/staff/projects",
  "/staff/analytics",
  "/staff/questionnaires",
  "/staff/archive",
]);

const workspaceAliases = ["/dashboard", "/modules", "/projects", "/calendar"];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [user, flagMap] = await Promise.all([getCurrentUser(), getFeatureFlagMap()]);
  if (!user) redirect("/login");
  if (user.suspended === true || user.active === false) return renderSuspendedAccountView();

  const [modulesResult, projectsResult] = await Promise.allSettled([
    listModules(user.id, { compact: true }),
    getUserProjects(user.id),
  ]);

  const navData = buildLayoutNavigationData({
    user,
    flagMap,
    modulesResult,
    projectsResult,
  });

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
      <div className="workspace-shell">{children}</div>
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

function buildLayoutNavigationData(params: {
  user: AuthenticatedUser;
  flagMap: Record<string, boolean>;
  modulesResult: PromiseSettledResult<Awaited<ReturnType<typeof listModules>>>;
  projectsResult: PromiseSettledResult<Awaited<ReturnType<typeof getUserProjects>>>;
}) {
  const moduleChildren = buildModuleChildren(params.modulesResult);
  const projectChildren = buildProjectChildren(params.projectsResult);
  const navLinks = buildBaseNavLinks(moduleChildren, projectChildren);
  const accessibleLinks = filterAccessibleNavLinks(navLinks, params.user, params.flagMap);
  const spaceLinks = buildSpaceLinks(params.user);
  const defaultSpaceHref = getDefaultSpaceOverviewPath(params.user);

  return { accessibleLinks, spaceLinks, defaultSpaceHref };
}

function buildModuleChildren(modulesResult: PromiseSettledResult<Awaited<ReturnType<typeof listModules>>>) {
  const base: NonNullable<NavLink["children"]> = [{ href: "/dashboard", label: "Overview" }];
  if (modulesResult.status !== "fulfilled" || modulesResult.value.length === 0) return base;

  return [
    ...base,
    ...modulesResult.value.map((module) => ({
      href: `/modules/${encodeURIComponent(module.id)}`,
      label: module.title,
    })),
  ];
}

function buildProjectChildren(projectsResult: PromiseSettledResult<Awaited<ReturnType<typeof getUserProjects>>>) {
  const base: NonNullable<NavLink["children"]> = [{ href: "/projects", label: "All projects" }];
  if (projectsResult.status !== "fulfilled") return base;

  return [
    ...base,
    ...projectsResult.value.map((project) => ({
      href: `/projects/${project.id}`,
      label: project.name,
    })),
  ];
}

function buildBaseNavLinks(moduleChildren: NonNullable<NavLink["children"]>, projectChildren: NonNullable<NavLink["children"]>): NavLink[] {
  return [
    { href: "/dashboard", label: "Modules", space: "workspace", children: moduleChildren },
    { href: "/projects", label: "Projects", space: "workspace", children: projectChildren },
    { href: "/calendar", label: "Calendar", space: "workspace" },
    { href: "/staff/dashboard", label: "Staff Overview", space: "staff" },
    { href: "/staff/modules", label: "My Modules", space: "staff" },
    { href: "/staff/projects", label: "Projects", space: "staff" },
    { href: "/staff/analytics", label: "Analytics", space: "staff" },
    { href: "/staff/questionnaires", label: "Questionnaires", space: "staff" },
    { href: "/staff/archive", label: "Archive", space: "staff" },
    { href: "/admin", label: "Admin Home", space: "admin" },
  ];
}

function filterAccessibleNavLinks(navLinks: NavLink[], user: AuthenticatedUser, flagMap: Record<string, boolean>) {
  const limitedStaffUser = isModuleScopedStaff(user);

  return navLinks
    .filter((link) => {
      if (link.flag && flagMap[link.flag] === false) return false;
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

  if (!isStaffOnlyAccount) {
    links.push({ href: "/dashboard", label: "Workspace", activePaths: workspaceAliases });
  }
  if (user.isStaff || isAdmin(user)) {
    links.push({ href: "/staff/dashboard", label: "Staff", activePaths: ["/staff"] });
  }
  if (isEnterpriseAdmin(user) || isAdmin(user)) {
    links.push({ href: "/enterprise", label: "Enterprise", activePaths: ["/enterprise"] });
  }
  if (isAdmin(user)) {
    links.push({ href: "/admin", label: "Admin", activePaths: ["/admin"] });
  }

  return links;
}
