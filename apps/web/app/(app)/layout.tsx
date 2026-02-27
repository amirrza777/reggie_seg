import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/shared/layout/AppShell";
import { Sidebar } from "@/shared/layout/Sidebar";
import { Topbar } from "@/shared/layout/Topbar";
import { SpaceSwitcher, type SpaceLink } from "@/shared/layout/SpaceSwitcher";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { getCurrentUser, isAdmin } from "@/shared/auth/session";
import { getFeatureFlagMap } from "@/shared/featureFlags";
export const dynamic = "force-dynamic";

type NavLink = {
  href: string;
  label: string;
  space: "workspace" | "staff" | "enterprise" | "admin";
};

const navLinks: NavLink[] = [
  // Workspace
  { href: "/dashboard", label: "Dashboard", space: "workspace" },
  { href: "/modules", label: "Modules", space: "workspace", flag: "modules" },
  { href: "/projects", label: "Projects", space: "workspace" },

  // Staff
  { href: "/staff/dashboard", label: "Staff Overview", space: "staff" },
  { href: "/staff/health", label: "Team Health", space: "staff" },
  { href: "/staff/analytics", label: "Analytics", space: "staff" },
  { href: "/staff/integrations", label: "Integrations", space: "staff" },
  { href: "/staff/questionnaires", label: "Questionnaires", space: "staff" },
  { href: "/staff/peer-assessments", label: "Peer Assessments", space: "staff" },

  // Admin
  { href: "/admin", label: "Admin Home", space: "admin" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
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

  const flagMap = await getFeatureFlagMap();

  const accessibleLinks = navLinks.filter((link) => {
    if (link.flag && flagMap[link.flag] === false) return false;
    if (link.space === "staff" && !(user?.isStaff || isAdmin(user))) return false;
    if (link.space === "admin" && !isAdmin(user)) return false;
    return true;
  });

  const spaceLinks: SpaceLink[] = [{ href: "/dashboard", label: "Workspace" }];
  if (user?.isStaff || isAdmin(user)) spaceLinks.push({ href: "/staff/dashboard", label: "Staff" });
  if (isAdmin(user)) spaceLinks.push({ href: "/admin", label: "Admin" });

  return (
    <AppShell
      sidebar={<Sidebar title="Workspace" links={accessibleLinks} />}
      topbar={<Topbar title="Team Feedback" titleHref="/dashboard" actions={<UserMenu />} />}
      ribbon={spaceLinks.length > 0 ? <SpaceSwitcher links={spaceLinks} /> : null}
    >
      <div className="workspace-shell">{children}</div>
    </AppShell>
  );
}
