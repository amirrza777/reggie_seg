import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/shared/layout/AppShell";
import { Sidebar } from "@/shared/layout/Sidebar";
import { Topbar } from "@/shared/layout/Topbar";
import { SpaceSwitcher, type SpaceLink } from "@/shared/layout/SpaceSwitcher";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { listModules } from "@/features/modules/api/client";
import { getUserProjects } from "@/features/projects/api/client";
import { getCurrentUser, isAdmin, isEnterpriseAdmin, isModuleScopedStaff } from "@/shared/auth/session";
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

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [user, flagMap] = await Promise.all([getCurrentUser(), getFeatureFlagMap()]);
  if (!user) redirect("/login");
  if (user.suspended === true || user.active === false) {
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

  let moduleChildren: NonNullable<NavLink["children"]> = [{ href: "/dashboard", label: "Overview" }];
  try {
    const modules = await listModules(user.id);
    if (modules.length > 0) {
      moduleChildren = [
        { href: "/dashboard", label: "Overview" },
        ...modules.map((module) => ({
          href: `/modules/${encodeURIComponent(module.id)}`,
          label: module.title,
        })),
      ];
    }
  } catch {
    // Keep base overview link if modules cannot be loaded.
  }

  let projectChildren: NonNullable<NavLink["children"]> = [{ href: "/projects", label: "All projects" }];
  try {
    const projects = await getUserProjects(user.id);
    projectChildren = [
      { href: "/projects", label: "All projects" },
      ...projects.map((project) => ({
        href: `/projects/${project.id}`,
        label: project.name,
      })),
    ];
  } catch {
    projectChildren = [{ href: "/projects", label: "All projects" }];
  }

  const navLinks: NavLink[] = [
    // Workspace
    { href: "/dashboard", label: "Modules", space: "workspace", children: moduleChildren },
    { href: "/projects", label: "Projects", space: "workspace", children: projectChildren },
    { href: "/calendar", label: "Calendar", space: "workspace" },

    // Staff
    { href: "/staff/dashboard", label: "Staff Overview", space: "staff" },
    { href: "/staff/modules", label: "My Modules", space: "staff" },
    { href: "/staff/projects", label: "Projects", space: "staff" },
    { href: "/staff/analytics", label: "Analytics", space: "staff" },
    { href: "/staff/questionnaires", label: "Questionnaires", space: "staff" },
    { href: "/staff/archive", label: "Archive", space: "staff" },

    // Admin
    { href: "/admin", label: "Admin Home", space: "admin" },
  ];

  const limitedStaffUser = isModuleScopedStaff(user);
  const moduleScopedStaffLinks = new Set([
    "/staff/dashboard",
    "/staff/modules",
    "/staff/projects",
    "/staff/analytics",
    "/staff/questionnaires",
    "/staff/archive",
  ]);

  const accessibleLinks = navLinks
    .filter((link) => {
      if (link.flag && flagMap[link.flag] === false) return false;
      if (link.space === "staff") {
        if (!(user?.isStaff || isAdmin(user))) return false;
        if (limitedStaffUser && !moduleScopedStaffLinks.has(link.href)) return false;
      }
      if (link.space === "admin" && !isAdmin(user)) return false;
      return true;
    })
    .map((link) => ({
      ...link,
      children: link.children?.filter((child) => !child.flag || flagMap[child.flag] !== false),
    }));

  const workspaceAliases = ["/dashboard", "/modules", "/projects", "/calendar"];
  const isStaffOnlyAccount = user.isStaff && !isAdmin(user) && !isEnterpriseAdmin(user);

  const spaceLinks: SpaceLink[] = [];
  if (!isStaffOnlyAccount) {
    spaceLinks.push({ href: "/dashboard", label: "Workspace", activePaths: workspaceAliases });
  }
  if (user?.isStaff || isAdmin(user)) spaceLinks.push({ href: "/staff/dashboard", label: "Staff", activePaths: ["/staff"] });
  if (isEnterpriseAdmin(user) || isAdmin(user)) spaceLinks.push({ href: "/enterprise", label: "Enterprise", activePaths: ["/enterprise"] });
  if (isAdmin(user)) spaceLinks.push({ href: "/admin", label: "Admin", activePaths: ["/admin"] });

  return (
    <AppShell
      sidebar={<Sidebar title="Workspace sections" links={accessibleLinks} mode="desktop" />}
      topbar={
        <Topbar
          leading={<Sidebar title="Navigate" links={accessibleLinks} mode="mobile" mobileSpaces={spaceLinks} />}
          title="Team Feedback"
          titleHref="/dashboard"
          actions={<><NotificationBell /><UserMenu /></>}
        />
      }
      ribbon={spaceLinks.length > 0 ? <SpaceSwitcher links={spaceLinks} /> : null}
    >
      <div className="workspace-shell">{children}</div>
    </AppShell>
  );
}
