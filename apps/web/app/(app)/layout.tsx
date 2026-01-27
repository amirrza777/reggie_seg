import type { ReactNode } from "react";
import { AppShell } from "@/shared/layout/AppShell";
import { Sidebar } from "@/shared/layout/Sidebar";
import { Topbar } from "@/shared/layout/Topbar";

const navLinks = [
  { href: "/modules", label: "Modules" },
  { href: "/projects/123", label: "Projects" },
  { href: "/admin", label: "Admin" },
  {href : "/questionnaires", label: "Questionnaires"}
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      sidebar={<Sidebar title="Workspace" links={navLinks} />}
      topbar={<Topbar title="Team Feedback" />}
    >
      {children}
    </AppShell>
  );
}
