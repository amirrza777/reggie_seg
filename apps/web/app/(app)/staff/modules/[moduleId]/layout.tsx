import { redirect } from "next/navigation";
import { ModuleWorkspaceNav } from "@/features/modules/components/ModuleWorkspaceNav";
import { StaffModuleWorkspaceHero } from "@/features/modules/components/StaffModuleWorkspaceHero";
import { loadStaffModuleWorkspaceContext } from "@/features/modules/staffModuleWorkspaceLayoutData";
import { getCurrentUser } from "@/shared/auth/session";

type LayoutProps = {
  params: Promise<{ moduleId: string }>;
  children: React.ReactNode;
};

export default async function StaffModuleWorkspaceLayout({ params, children }: LayoutProps) {
  const { moduleId } = await params;
  const ctx = await loadStaffModuleWorkspaceContext(moduleId);
  if (!ctx) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    redirect("/staff/modules");
  }

  return (
    <div className="staff-projects module-workspace module-workspace--staff">
      <StaffModuleWorkspaceHero ctx={ctx} />
      <div className="stack stack--tabbed" style={{ gap: 16 }}>
        <ModuleWorkspaceNav moduleId={moduleId} basePath="/staff/modules" />
        {children}
      </div>
    </div>
  );
}
