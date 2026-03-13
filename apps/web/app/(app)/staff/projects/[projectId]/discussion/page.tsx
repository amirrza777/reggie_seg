import Link from "next/link";
import { redirect } from "next/navigation";
import { ForumSettingsCard } from "@/features/forum/components/ForumSettingsCard";
import { getStaffProjectTeams } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";

export const metadata = { title: "Discussion Forum (Staff)" };

type StaffProjectDiscussionPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectDiscussionPage({ params }: StaffProjectDiscussionPageProps) {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  if (Number.isNaN(numericProjectId)) {
    return <p className="muted">Invalid project ID.</p>;
  }

  let data: Awaited<ReturnType<typeof getStaffProjectTeams>> | null = null;
  let errorMessage: string | null = null;
  try {
    data = await getStaffProjectTeams(user.id, numericProjectId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load project forum settings.";
  }

  if (!data) {
    return (
      <div className="stack">
        <p className="muted">{errorMessage ?? "Project not found."}</p>
        <Link href="/staff/projects" className="pill-nav__link" style={{ width: "fit-content" }}>
          Back to staff projects
        </Link>
      </div>
    );
  }

  const totalStudents = data.teams.reduce((sum, team) => sum + team.allocations.length, 0);

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Discussion forum</p>
        <h1 className="staff-projects__title">{data.project.name}</h1>
        <p className="staff-projects__desc">
          Module: {data.project.moduleName}. Review forum privacy settings for students in this project.
        </p>
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">{data.teams.length} team{data.teams.length === 1 ? "" : "s"}</span>
          <span className="staff-projects__badge">
            {totalStudents} student{totalStudents === 1 ? "" : "s"}
          </span>
          <Link href={`/staff/projects/${data.project.id}`} className="staff-projects__badge">
            Back to teams
          </Link>
        </div>
      </section>

      <section className="staff-projects__team-card" aria-label="Forum privacy settings">
        <h2 className="staff-projects__card-title">Forum privacy</h2>
        <p className="staff-projects__card-sub">
          Choose whether student names should be visible in the forum.
        </p>
        <ForumSettingsCard projectId={numericProjectId} />
      </section>
    </div>
  );
}
