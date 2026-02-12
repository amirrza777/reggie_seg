import type { ReactNode } from "react";
import { AppShell } from "@/shared/layout/AppShell";
import { Sidebar } from "@/shared/layout/Sidebar";
import { Topbar } from "@/shared/layout/Topbar";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { getCurrentUser, isAdmin } from "@/shared/auth/session";
export const dynamic = "force-dynamic";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/modules", label: "Modules" },
  { href: "/projects", label: "Projects" },
  { href: "/staff/questionnaires", label: "Questionnaires" },
  { href: "/staff/peer-assessments", label: "Staff Peer Assessments" },
  { href: "/admin", label: "Admin" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const filteredLinks = navLinks.filter((link) => (link.href === "/admin" ? isAdmin(user) : true));

  return (
    <AppShell
      sidebar={<Sidebar title="Workspace" links={filteredLinks} />}
      topbar={<Topbar title="Team Feedback" actions={<UserMenu />} />}
    >
      {children}
    </AppShell>
  );
}
