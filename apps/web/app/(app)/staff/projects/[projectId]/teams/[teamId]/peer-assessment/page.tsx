import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/projects/api/client";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { ProgressCardGrid } from "@/shared/ui/ProgressCardGrid";
import { StaffTeamSectionNav } from "@/features/staff/projects/components/StaffTeamSectionNav";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

export default async function StaffPeerAssessmentSectionPage({ params }: PageProps) {
  const { projectId, teamId } = await params;

  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);
  if (Number.isNaN(numericProjectId) || Number.isNaN(numericTeamId)) {
    return <p className="muted">Invalid project or team ID.</p>;
  }

  let projectData: Awaited<ReturnType<typeof getStaffProjectTeams>> | null = null;
  let projectError: string | null = null;
  try {
    projectData = await getStaffProjectTeams(user.id, numericProjectId);
  } catch (error) {
    projectError = error instanceof Error ? error.message : "Failed to load project team data.";
  }

  const team = projectData?.teams.find((item) => item.id === numericTeamId) ?? null;
  if (!projectData || !team) {
    return (
      <div className="stack">
        <p className="muted">{projectError ?? "Team not found in this project."}</p>
        <Link href={`/staff/projects/${projectId}`} className="pill-nav__link" style={{ width: "fit-content" }}>
          Back to project teams
        </Link>
      </div>
    );
  }

  let students: Awaited<ReturnType<typeof getTeamDetails>>["students"] = [];
  let detailError: string | null = null;
  try {
    const detailData = await getTeamDetails(user.id, projectData.project.moduleId, numericTeamId);
    students = detailData.students;
  } catch (error) {
    detailError = error instanceof Error ? error.message : "Failed to load peer assessment data.";
  }

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Peer Assessment</p>
        <h1 className="staff-projects__title">{team.teamName}</h1>
        <p className="staff-projects__desc">
          Project: {projectData.project.name}. Review submission progress for each student in this team.
        </p>
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">Project {projectData.project.id}</span>
          <span className="staff-projects__badge">Team {team.id}</span>
          <Link href={`/staff/projects/${projectData.project.id}/teams/${team.id}`} className="staff-projects__badge">
            Back to team overview
          </Link>
        </div>
      </section>

      <StaffTeamSectionNav projectId={projectId} teamId={teamId} />

      <section className="staff-projects__team-card">
        <h3 style={{ margin: 0 }}>Assessment progress by student</h3>
        <p className="muted" style={{ margin: 0 }}>
          This section is for peer-assessment completion tracking only. Use{" "}
          <Link href={`/staff/projects/${projectData.project.id}/teams/${team.id}/grading`} className="staff-projects__badge">
            Grading
          </Link>{" "}
          for marks and{" "}
          <Link href={`/staff/projects/${projectData.project.id}/teams/${team.id}/peer-feedback`} className="staff-projects__badge">
            Peer feedback
          </Link>{" "}
          for review completion.
        </p>
        {detailError ? <p className="muted" style={{ marginTop: 8 }}>{detailError}</p> : null}
        {!detailError && students.length === 0 ? (
          <p className="muted" style={{ marginTop: 8 }}>
            No student allocation data is available for this team yet.
          </p>
        ) : null}
        {!detailError && students.length > 0 ? (
          <ProgressCardGrid
            items={students}
            getHref={(item) =>
              item.id == null
                ? undefined
                : `/staff/peer-assessments/module/${projectData.project.moduleId}/team/${team.id}/student/${item.id}`
            }
          />
        ) : null}
      </section>
    </div>
  );
}
