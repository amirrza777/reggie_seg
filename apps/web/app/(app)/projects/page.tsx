import { getUserProjects } from "@/features/projects/api/client";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { getCurrentUser } from "@/features/auth/api/client";

export default async function ProjectsListPage() {
  
  const profile = await getCurrentUser();
  console.log("User profile:", profile);
  let id = 4;
  if(profile) {
    id = profile.id;
  }
  console.log(id);
  const projects = await getUserProjects(id);
  return (
    <div className="stack">
      <div style={{ padding: "20px" }}>
        <h1>Your Projects</h1>
        <p style={{ color: "#666", marginTop: "8px" }}>
          {projects.length > 0 ? "Select a project to view details, peer assessments, and more." : "You have no projects assigned."}
        </p>
      </div>
     {projects.length > 0 ? <ProjectList projects={projects} /> : null}
    </div>
  );
}
