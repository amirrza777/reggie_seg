import { getProject } from "@/features/projects/api/client";
import { ProjectNav } from "@/features/projects/components/ProjectNav";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  
  
  const project = await getProject(projectId);
  
  return (
    <div className="stack">
      <ProjectNav projectId={projectId} />
      <div style={{ padding: "20px" }}>
        <h1>{project?.name || "Project"}</h1>
        <p style={{ color: "#666", marginTop: "8px" }}>
          Project ID: {projectId}
        </p>
      </div>
    </div>
  );
}
