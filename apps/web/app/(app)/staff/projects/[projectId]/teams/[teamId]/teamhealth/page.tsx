import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams, getStaffTeamMcfRequests } from "@/features/projects/api/client";
import { StaffTeamSectionNav } from "@/features/staff/projects/components/StaffTeamSectionNav";
import "@/features/staff/projects/styles/staff-projects.css";
import type { MCFRequest } from "@/features/projects/types";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

function formatStatus(status: string) {
  return status
    .split("_")
    .map((token) => token.charAt(0) + token.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
}

export default async function StaffTeamHealthPage({ params }: PageProps) {
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

  let requests: MCFRequest[] = [];
  let requestsError: string | null = null;
  try {
    requests = await getStaffTeamMcfRequests(user.id, numericProjectId, numericTeamId);
  } catch (error) {
    requestsError = error instanceof Error ? error.message : "Failed to load MCF requests.";
  }

  const openCount = requests.filter((item) => item.status === "OPEN").length;
  const inReviewCount = requests.filter((item) => item.status === "IN_REVIEW").length;
  const resolvedCount = requests.filter((item) => item.status === "RESOLVED").length;

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Team Health</p>
        <h1 className="staff-projects__title">{team.teamName}</h1>
        <p className="staff-projects__desc">
          Project: {projectData.project.name}. Review MCF requests raised by team members.
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

      <section className="staff-projects__grid" aria-label="MCF summary">
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">Total requests</h3>
          <p className="staff-projects__card-sub">{requests.length}</p>
        </article>
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">Open</h3>
          <p className="staff-projects__card-sub">{openCount}</p>
        </article>
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">In review</h3>
          <p className="staff-projects__card-sub">{inReviewCount}</p>
        </article>
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">Resolved</h3>
          <p className="staff-projects__card-sub">{resolvedCount}</p>
        </article>
      </section>

      <section className="staff-projects__team-list" aria-label="Team MCF requests">
        {requestsError ? (
          <article className="staff-projects__team-card">
            <p className="muted" style={{ margin: 0 }}>{requestsError}</p>
          </article>
        ) : requests.length === 0 ? (
          <article className="staff-projects__team-card">
            <p className="muted" style={{ margin: 0 }}>
              No MCF requests have been submitted for this team yet.
            </p>
          </article>
        ) : (
          requests.map((request) => (
            <article key={request.id} className="staff-projects__team-card">
              <div className="staff-projects__team-top">
                <h3 className="staff-projects__team-title">{request.subject}</h3>
                <span>{formatStatus(request.status)}</span>
              </div>
              <p style={{ margin: 0 }}>{request.details}</p>
              <p className="staff-projects__team-count">
                Submitted by {request.requester.firstName} {request.requester.lastName} on{" "}
                {formatDate(request.createdAt)}
              </p>
              {request.reviewedBy ? (
                <p className="muted" style={{ margin: 0 }}>
                  Reviewed by {request.reviewedBy.firstName} {request.reviewedBy.lastName}
                  {request.reviewedAt ? ` on ${formatDate(request.reviewedAt)}` : ""}
                </p>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
