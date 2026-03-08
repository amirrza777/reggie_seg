import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffProjects } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { Placeholder } from "@/shared/ui/Placeholder";
import "@/features/projects/styles/project-list.css";

export default async function StaffProjectsPage() {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  let projects: Awaited<ReturnType<typeof getStaffProjects>> = [];
  let errorMessage: string | null = null;
  try {
    projects = await getStaffProjects(user.id);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load staff projects.";
  }

  return (
    <div className="stack stack--loose">
      <Placeholder
        title="Staff Projects"
        description="Projects where you have staff-level ownership. Open one to inspect teams and team-level views."
      />

      {errorMessage ? <p className="muted">{errorMessage}</p> : null}
      {!errorMessage && projects.length === 0 ? (
        <p className="muted">No staff projects found yet. Ask an admin to assign you as a module lead.</p>
      ) : null}

      <section className="project-list" aria-label="Staff project list">
        <div className="project-list__grid">
          {projects.map((project) => (
            <Link key={project.id} href={`/staff/projects/${project.id}`} className="project-card card">
              <div className="project-card__header">
                <h2 className="project-card__title">{project.name}</h2>
                <p className="project-card__module">Module: {project.moduleName}</p>
              </div>
              <p className="project-card__summary">
                {project.teamCount} team{project.teamCount === 1 ? "" : "s"} available for staff review.
              </p>
              <div className="project-card__footer">
                <span className="project-card__cta">View Teams</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
