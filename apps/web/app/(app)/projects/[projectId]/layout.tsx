import { getProject } from "@/features/projects/api/client";
import { ArchivedModuleProjectScopeBanner } from "@/features/modules/components/ArchivedModuleProjectScopeBanner";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
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

  let projectName = `Project ${projectId}`;
  let moduleArchivedAt: string | null | undefined;
  try {
    const project = await getProject(projectId);
    projectName = project.name;
    moduleArchivedAt = project.moduleArchivedAt ?? null;
  } catch {
    // keep fallback label
  }

  return (
    <div className="stack stack--tabbed" style={{ gap: 16 }}>
      <Breadcrumbs items={[{ label: "Projects", href: "/projects" }, { label: projectName }]} />
      <ArchivedModuleProjectScopeBanner moduleArchivedAt={moduleArchivedAt} audience="student" />
      <ProjectNav projectId={projectId} enabledFlags={navFlags} />
      {children}
    </div>
  );
}
