import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/shared/layout/AppShell";
import { Sidebar } from "@/shared/layout/Sidebar";
import { Topbar } from "@/shared/layout/Topbar";
import { SpaceSwitcher, type SpaceLink } from "@/shared/layout/SpaceSwitcher";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { getCurrentUser, isAdmin, isEnterpriseAdmin } from "@/shared/auth/session";

export const dynamic = "force-dynamic";

const enterpriseAdminNav = [
  { href: "/enterprise", label: "Enterprise overview", space: "enterprise" as const },
  { href: "/enterprise/modules", label: "Module management", space: "enterprise" as const },
  { href: "/enterprise/groups", label: "Group management", space: "enterprise" as const },
];

const enterpriseStaffNav = [
  { href: "/enterprise/modules", label: "Module management", space: "enterprise" as const },
];

export default async function EnterpriseLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const canAccessEnterpriseAdmin = isEnterpriseAdmin(user) || isAdmin(user);
  const canAccessModuleManagement = canAccessEnterpriseAdmin || user.role === "STAFF";

  if (!canAccessModuleManagement) {
    redirect("/dashboard");
  }

  const enterpriseHomeHref = canAccessEnterpriseAdmin ? "/enterprise" : "/enterprise/modules";
  const enterpriseNav = canAccessEnterpriseAdmin ? enterpriseAdminNav : enterpriseStaffNav;
  const workspaceAliases = [
    "/staff/dashboard",
    "/staff/modules",
    "/staff/projects",
    "/staff/analytics",
    "/staff/questionnaires",
  ];

  const spaceLinks: SpaceLink[] = [
    { href: "/dashboard", label: "Workspace", activePaths: workspaceAliases },
    { href: "/staff/dashboard", label: "Staff" },
    { href: enterpriseHomeHref, label: "Enterprise" },
  ];
  if (isAdmin(user)) spaceLinks.push({ href: "/admin", label: "Admin" });

  return (
    <AppShell
      sidebar={<Sidebar title="Enterprise" links={enterpriseNav} />}
      topbar={<Topbar title="Team Feedback" titleHref={enterpriseHomeHref} actions={<UserMenu />} />}
      ribbon={<SpaceSwitcher links={spaceLinks} />}
    >
      <div className="workspace-shell">{children}</div>
    </AppShell>
  );
}
