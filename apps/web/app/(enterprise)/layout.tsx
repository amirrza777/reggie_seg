import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/shared/layout/AppShell";
import { Sidebar } from "@/shared/layout/Sidebar";
import { Topbar } from "@/shared/layout/Topbar";
import { SpaceSwitcher, type SpaceLink } from "@/shared/layout/SpaceSwitcher";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { getCurrentUser, isAdmin, isEnterpriseAdmin } from "@/shared/auth/session";

export const dynamic = "force-dynamic";

const enterpriseNav = [{ href: "/enterprise", label: "Enterprise overview", space: "enterprise" as const }];

export default async function EnterpriseLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!isEnterpriseAdmin(user) && !isAdmin(user)) {
    redirect("/dashboard");
  }

  const workspaceAliases = ["/staff/integrations", "/staff/questionnaires", "/staff/peer-assessments"];

  const spaceLinks: SpaceLink[] = [
    { href: "/dashboard", label: "Workspace", activePaths: workspaceAliases },
    { href: "/staff/dashboard", label: "Staff" },
    { href: "/enterprise", label: "Enterprise" },
    { href: "/admin", label: "Admin" },
  ];

  return (
    <AppShell
      sidebar={<Sidebar title="Enterprise" links={enterpriseNav} />}
      topbar={<Topbar title="Enterprise" titleHref="/enterprise" actions={<UserMenu />} />}
      ribbon={<SpaceSwitcher links={spaceLinks} />}
    >
      <div className="workspace-shell">{children}</div>
    </AppShell>
  );
}
