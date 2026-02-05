import type { ReactNode } from "react";
import { AppShell } from "@/shared/layout/AppShell";
import { Sidebar } from "@/shared/layout/Sidebar";
import { Topbar } from "@/shared/layout/Topbar";
import { UserMenu } from "@/features/auth/components/UserMenu";

const navLinks = [
  { href: "/admin", label: "Admin" },
  { href: "/modules", label: "Modules" },
  { href: "/projects/123", label: "Projects" },
  { href : "/staff/questionnaires", label: "Questionnaires"},
  { href: "/staff/peer-assessments", label: "Staff Peer Assessments" }
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      sidebar={<Sidebar title="Workspace" links={navLinks} />}
      topbar={<Topbar title="Team Feedback" actions={<UserMenu />} />}
    >
      {children}
    </AppShell>
  );
}
