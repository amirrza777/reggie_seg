import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffProjects } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";

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
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Staff Workspace</p>
        <h1 className="staff-projects__title">Projects</h1>
        <p className="staff-projects__desc">
          Select a project you own and drill down into its teams.
        </p>
        {!errorMessage ? (
          <div className="staff-projects__meta">
            <span className="staff-projects__badge">{projects.length} project{projects.length === 1 ? "" : "s"}</span>
          </div>
        ) : null}
      </section>

      {errorMessage ? <p className="muted">{errorMessage}</p> : null}
      {!errorMessage && projects.length === 0 ? (
        <p className="muted">No staff projects found yet. Ask an admin to assign you as a module lead.</p>
      ) : null}

      <section className="staff-projects__grid" aria-label="Staff project list">
          {projects.map((project) => {
            const repoOk = project.hasGithubRepo;
            const allConnected = project.membersTotal > 0 && project.membersConnected === project.membersTotal;
            const someConnected = project.membersTotal > 0 && project.membersConnected > 0 && project.membersConnected < project.membersTotal;
            const noneConnected = project.membersTotal > 0 && project.membersConnected === 0;
            return (
              <Link key={project.id} href={`/staff/projects/${project.id}`} className="staff-projects__card">
                <div>
                  <h2 className="staff-projects__card-title">{project.name}</h2>
                  <p className="staff-projects__card-sub">Module: {project.moduleName}</p>
                </div>
                <p className="staff-projects__card-sub">
                  {project.teamCount} team{project.teamCount === 1 ? "" : "s"} available for staff review.
                </p>
                <div className="staff-projects__gh-health">
                  <span className={`staff-projects__gh-pill ${repoOk ? "staff-projects__gh-pill--ok" : "staff-projects__gh-pill--warn"}`}>
                    {repoOk ? "✓ Repo linked" : "⚠ No repo"}
                  </span>
                  {project.membersTotal > 0 && (
                    <span className={`staff-projects__gh-pill ${allConnected ? "staff-projects__gh-pill--ok" : someConnected ? "staff-projects__gh-pill--partial" : noneConnected ? "staff-projects__gh-pill--warn" : ""}`}>
                      {project.membersConnected}/{project.membersTotal} GitHub
                    </span>
                  )}
                </div>
                <div className="staff-projects__card-action">
                  <span>View teams</span>
                </div>
              </Link>
            );
          })}
      </section>
    </div>
  );
}
