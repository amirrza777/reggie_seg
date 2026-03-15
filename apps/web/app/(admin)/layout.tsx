import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/shared/layout/AppShell";
import { Sidebar } from "@/shared/layout/Sidebar";
import { Topbar } from "@/shared/layout/Topbar";
import { SpaceSwitcher, type SpaceLink } from "@/shared/layout/SpaceSwitcher";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { getCurrentUser, isAdmin } from "@/shared/auth/session";

export const dynamic = "force-dynamic";

const SUPER_ADMIN_EMAIL = "admin@kcl.ac.uk";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdmin(user)) {
    redirect("/dashboard");
  }

  const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL;
  const adminNav = [
    { href: "/admin", label: "Admin dashboard", space: "admin" as const },
    ...(isSuperAdmin ? [{ href: "/admin/enterprises", label: "Enterprises", space: "admin" as const }] : []),
  ];

  const spaceLinks: SpaceLink[] = [
    { href: "/dashboard", label: "Workspace" },
    { href: "/staff/dashboard", label: "Staff" },
    { href: "/enterprise", label: "Enterprise" },
    { href: "/admin", label: "Admin" },
  ];

  return (
    <AppShell
      sidebar={<Sidebar title="Admin sections" links={adminNav} mode="desktop" />}
      topbar={
        <Topbar
          leading={<Sidebar title="Navigate" links={adminNav} mode="mobile" mobileSpaces={spaceLinks} />}
          title="Team Feedback"
          titleHref="/admin"
          actions={<UserMenu />}
        />
      }
      ribbon={<SpaceSwitcher links={spaceLinks} />}
    >
      <div className="workspace-shell">{children}</div>
    </AppShell>
  );
}
