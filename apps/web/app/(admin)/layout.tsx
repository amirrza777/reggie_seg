import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/shared/layout/AppShell";
import { Sidebar } from "@/shared/layout/Sidebar";
import { Topbar } from "@/shared/layout/Topbar";
import { SpaceSwitcher, type SpaceLink } from "@/shared/layout/SpaceSwitcher";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { getCurrentUser, isAdmin } from "@/shared/auth/session";

export const dynamic = "force-dynamic";

const adminNav = [
  { href: "/admin", label: "Admin dashboard", space: "admin" as const },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdmin(user)) {
    redirect("/dashboard");
  }

  const spaceLinks: SpaceLink[] = [
    {
      href: "/dashboard",
      label: "Workspace",
    },
    {
      href: "/staff/dashboard",
      label: "Staff",
    },
    {
      href: "/admin",
      label: "Admin",
    },
  ];

  return (
    <AppShell
      sidebar={<Sidebar title="Admin" links={adminNav} />}
      topbar={<Topbar title="Team Feedback" titleHref="/dashboard" actions={<UserMenu />} />}
      ribbon={<SpaceSwitcher links={spaceLinks} />}
    >
      <div className="workspace-shell">{children}</div>
    </AppShell>
  );
}
