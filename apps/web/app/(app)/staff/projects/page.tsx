import { getUserProjects } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import "@/features/projects/styles/project-list.css";

export default async function StaffProjectsPage() {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  let projects: Awaited<ReturnType<typeof getUserProjects>> = [];
  if (user) {
    try {
      projects = await getUserProjects(user.id);
    } catch {
      // leave empty
    }
  }

  return (
    <div className="stack">
      <div>
        <h1>Projects (staff view)</h1>
        <p>
          {projects.length > 0
            ? "Select a project to view read-only Trello."
            : "You have no projects assigned."}
        </p>
      </div>
      {projects.length > 0 ? (
        <div className="project-list">
          <div className="project-list__grid">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/staff/projects/${project.id}`}
                className="project-card card"
              >
                <div className="project-card__header">
                  <h2 className="project-card__title">{project.name}</h2>
                  <p className="project-card__module">
                    Module: {project.moduleName || "Module not assigned"}
                  </p>
                </div>
                {project.summary && (
                  <p className="project-card__summary">{project.summary}</p>
                )}
                <div className="project-card__footer">
                  <span className="project-card__cta">View Project →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
