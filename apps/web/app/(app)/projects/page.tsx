import { getUserProjects } from "@/features/projects/api/client";
import { ProjectList } from "@/features/projects/components/ProjectList";

export default async function ProjectsListPage() {
  // Use temporary user ID 1 for now
  const userId = 4;
  
  const projects = await getUserProjects(userId);


  return (
    <div className="stack">
      <div style={{ padding: "20px" }}>
        <h1>Your Projects</h1>
        <p style={{ color: "#666", marginTop: "8px" }}>
          Select a project to view details, peer assessments, and more.
        </p>
      </div>
      <ProjectList projects={projects} />
    </div>
  );
}
