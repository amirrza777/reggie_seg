import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/shared/layout/AppShell";
import { Sidebar } from "@/shared/layout/Sidebar";
import { Topbar } from "@/shared/layout/Topbar";
import { getCurrentUser, isAdmin } from "@/shared/auth/session";

export const dynamic = "force-dynamic";

const adminNav = [
  { href: "/admin", label: "Admin dashboard" },
  { href: "/dashboard", label: "Workspace" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdmin(user)) {
    redirect("/dashboard");
  }

  return (
    <AppShell
      sidebar={<Sidebar title="Admin" links={adminNav} />}
      topbar={<Topbar title="Admin control panel" />}
    >
      {children}
    </AppShell>
  );
}
