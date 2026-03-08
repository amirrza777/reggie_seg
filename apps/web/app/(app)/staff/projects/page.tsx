import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffProjects } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { Placeholder } from "@/shared/ui/Placeholder";

export default async function StaffProjectsPage() {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  let projects: Awaited<ReturnType<typeof getStaffProjects>> = [];
  let errorMessage: string | null = null;
  try {
    projects = await getStaffProjects();
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

      <section className="stack" aria-label="Staff project list">
        {projects.map((project) => (
          <article key={project.id} className="card stack" style={{ gap: 8 }}>
            <p className="muted" style={{ margin: 0, textTransform: "uppercase", letterSpacing: 0.35, fontSize: 12 }}>
              {project.moduleName}
            </p>
            <h3 style={{ margin: 0 }}>{project.name}</h3>
            <p className="muted" style={{ margin: 0 }}>
              {project.teamCount} team{project.teamCount === 1 ? "" : "s"}
            </p>
            <div>
              <Link className="pill-nav__link pill-nav__link--active" href={`/staff/projects/${project.id}`}>
                Open project teams
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
