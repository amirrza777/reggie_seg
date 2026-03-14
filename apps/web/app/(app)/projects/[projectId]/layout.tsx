import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getProjectNavFlags } from "@/features/projects/navFlags";
import { getCurrentUser } from "@/shared/auth/session";

type LayoutProps = {
  params: Promise<{ projectId: string }>;
  children: React.ReactNode;
};

export default async function ProjectLayout({ params, children }: LayoutProps) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  const navFlags = await getProjectNavFlags(user?.id, Number(projectId));
  //enabledFlags={navFlags}
  return (
    <div className="stack stack--tabbed" style={{ gap: 16 }}>
      <ProjectNav projectId={projectId}  />
      {children}
    </div>
  );
}
