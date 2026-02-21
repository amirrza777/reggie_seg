import type { ReactNode } from "react";
import { AppShell } from "@/shared/layout/AppShell";
import { Sidebar } from "@/shared/layout/Sidebar";
import { Topbar } from "@/shared/layout/Topbar";
import { SpaceSwitcher, type SpaceLink } from "@/shared/layout/SpaceSwitcher";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { getCurrentUser, isAdmin } from "@/shared/auth/session";
export const dynamic = "force-dynamic";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/modules", label: "Modules" },
  { href: "/projects", label: "Projects" },
  // Staff-only
  { href: "/staff/dashboard", label: "Staff Overview", staffOnly: true },
  { href: "/staff/health", label: "Team Health", staffOnly: true },
  { href: "/staff/analytics", label: "Analytics", staffOnly: true },
  { href: "/staff/integrations", label: "Integrations", staffOnly: true },
  { href: "/staff/questionnaires", label: "Questionnaires", staffOnly: true },
  { href: "/staff/peer-assessments", label: "Peer Assessments", staffOnly: true },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const filteredLinks = navLinks.filter((link) => {
    if (link.href === "/admin") return isAdmin(user);
    if (link.staffOnly) return user?.isStaff || isAdmin(user);
    return true;
  });
  const spaceLinks: SpaceLink[] = [
    {
      href: "/dashboard",
      label: "Workspace",
    },
  ];

  if (isAdmin(user)) {
    spaceLinks.push({
      href: "/admin",
      label: "Admin",
    });
  }

  return (
    <AppShell
      sidebar={<Sidebar title="Workspace" links={filteredLinks} />}
      topbar={<Topbar title="Team Feedback" titleHref="/dashboard" actions={<UserMenu />} />}
      ribbon={spaceLinks.length > 0 ? <SpaceSwitcher links={spaceLinks} /> : null}
    >
      <div className="workspace-shell">{children}</div>
    </AppShell>
  );
}
