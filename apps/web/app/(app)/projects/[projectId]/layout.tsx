import { getProject } from "@/features/projects/api/client";
import { ArchivedProjectScopeBanner } from "@/features/modules/components/ArchivedProjectScopeBanner";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { resolveStudentProjectWorkspaceCapability } from "@/features/projects/lib/resolveStudentProjectWorkspaceCapability";
import { ProjectWorkspaceCanEditProvider } from "@/features/projects/workspace/ProjectWorkspaceCanEditContext";
import { getProjectNavFlags } from "@/features/projects/navFlags";
import { getCurrentUser } from "@/shared/auth/session";
import { Breadcrumbs, type BreadcrumbItem } from "@/shared/layout/Breadcrumbs";

type LayoutProps = {
  params: Promise<{ projectId: string }>;
  children: React.ReactNode;
};

export default async function ProjectLayout({ params, children }: LayoutProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const user = await getCurrentUser();
  const navFlags = await getProjectNavFlags(user?.id, numericProjectId);
  const workspaceCapability = await resolveStudentProjectWorkspaceCapability(user?.id, numericProjectId);

  let projectName = `Project ${projectId}`;
  let moduleId: number | undefined;
  let moduleName: string | null = null;
  let moduleArchivedAt: string | null | undefined;
  let projectArchivedAt: string | null | undefined;
  try {
    const project = await getProject(projectId);
    projectName = project.name;
    moduleArchivedAt = project.moduleArchivedAt ?? null;
    projectArchivedAt = project.archivedAt ?? null;
    const mid = project.moduleId;
    if (typeof mid === "number" && Number.isFinite(mid) && mid > 0) {
      moduleId = mid;
    }
    const label = project.moduleName?.trim();
    if (label) {
      moduleName = label;
    }
  } catch {
    // keep fallback label
  }

  const breadcrumbItems: BreadcrumbItem[] = [];
  if (moduleName != null && moduleId != null) {
    breadcrumbItems.push({
      label: moduleName,
      href: `/modules/${encodeURIComponent(String(moduleId))}`,
    });
  }
  breadcrumbItems.push({ label: "Projects", href: "/projects" }, { label: projectName });

  return (
    <div className="stack stack--tabbed" style={{ gap: 16 }}>
      <Breadcrumbs items={breadcrumbItems} />
      <ArchivedProjectScopeBanner
        moduleArchivedAt={moduleArchivedAt}
        projectArchivedAt={projectArchivedAt}
        audience="student"
        projectId={projectId}
      />
      <ProjectNav projectId={projectId} enabledFlags={navFlags} />
      <ProjectWorkspaceCanEditProvider value={workspaceCapability}>{children}</ProjectWorkspaceCanEditProvider>
    </div>
  );
}
