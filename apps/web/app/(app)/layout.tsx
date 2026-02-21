import type { ReactNode } from "react";
import { AppShell } from "@/shared/layout/AppShell";
import { Sidebar } from "@/shared/layout/Sidebar";
import { Topbar } from "@/shared/layout/Topbar";
import { SpaceSwitcher, type SpaceLink } from "@/shared/layout/SpaceSwitcher";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { getCurrentUser, isAdmin } from "@/shared/auth/session";
export const dynamic = "force-dynamic";

type NavLink = {
  href: string;
  label: string;
  space: "workspace" | "staff" | "admin";
};

const navLinks: NavLink[] = [
  // Workspace
  { href: "/dashboard", label: "Dashboard", space: "workspace" },
  { href: "/modules", label: "Modules", space: "workspace" },
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
  // Filter only by access; Sidebar will further filter by active space on the client using pathname.
  const accessibleLinks = navLinks.filter((link) => {
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
