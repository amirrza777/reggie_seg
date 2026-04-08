import { getProject } from "@/features/projects/api/client";
import { ArchivedProjectScopeBanner } from "@/features/modules/components/ArchivedProjectScopeBanner";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { resolveStudentProjectWorkspaceCapability } from "@/features/projects/lib/resolveStudentProjectWorkspaceCapability";
import { ProjectWorkspaceCanEditProvider } from "@/features/projects/workspace/ProjectWorkspaceCanEditContext";
import { getProjectNavFlags } from "@/features/projects/navFlags";
import { getCurrentUser } from "@/shared/auth/session";
import { Breadcrumbs } from "@/shared/layout/Breadcrumbs";

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
  let moduleArchivedAt: string | null | undefined;
  let projectArchivedAt: string | null | undefined;
  try {
    const project = await getProject(projectId);
    projectName = project.name;
    moduleArchivedAt = project.moduleArchivedAt ?? null;
    projectArchivedAt = project.archivedAt ?? null;
  } catch {
    // keep fallback label
  }

  return (
    <div className="stack stack--tabbed" style={{ gap: 16 }}>
      <Breadcrumbs items={[{ label: "Projects", href: "/projects" }, { label: projectName }]} />
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
