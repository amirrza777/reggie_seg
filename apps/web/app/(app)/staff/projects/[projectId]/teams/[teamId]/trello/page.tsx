import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getProjectDeadline } from "@/features/projects/api/client";
import { StaffProjectTrelloContent } from "@/features/staff/trello/StaffProjectTrelloContent";
import { StaffTrelloSummaryView } from "@/features/staff/trello/StaffTrelloSummaryView";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

type TrelloPageContext = {
  projectId: string;
  teamId: string;
  numericProjectId: number;
  numericTeamId: number;
};

export default async function StaffTrelloSectionPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const context = await parseTrelloPageContext(params);
  if (!context) {
    return <p className="muted">Invalid project or team ID.</p>;
  }

  const projectResult = await loadProjectTeamData(user.id, context.numericProjectId);
  const team = projectResult.projectData?.teams.find((item) => item.id === context.numericTeamId) ?? null;
  if (!projectResult.projectData || !team) {
    return <MissingTeamView message={projectResult.projectError} />;
  }

  const deadline = await loadProjectDeadline(user.id, context.numericProjectId);

  return (
    <div className="staff-projects">
      <section className="staff-projects__team-card" aria-label="Team Trello activity">
        <StaffProjectTrelloContent
          projectId={context.projectId}
          teamId={team.id}
          moduleId={projectResult.projectData.project.moduleId}
          teamName={team.teamName}
          deadline={deadline ?? undefined}
          viewComponent={StaffTrelloSummaryView}
        />
      </section>
    </div>
  );
}

async function parseTrelloPageContext(paramsPromise: PageProps["params"]): Promise<TrelloPageContext | null> {
  const { projectId, teamId } = await paramsPromise;
  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);
  if (Number.isNaN(numericProjectId) || Number.isNaN(numericTeamId)) return null;
  return { projectId, teamId, numericProjectId, numericTeamId };
}

async function loadProjectTeamData(userId: number, projectId: number) {
  try {
    const projectData = await getStaffProjectTeams(userId, projectId);
    return { projectData, projectError: null };
  } catch (error) {
    const projectError = error instanceof Error ? error.message : "Failed to load project team data.";
    return { projectData: null, projectError };
  }
}

async function loadProjectDeadline(userId: number, projectId: number) {
  try {
    return await getProjectDeadline(userId, projectId);
  } catch {
    return null;
  }
}

function MissingTeamView({ message }: { message: string | null }) {
  return (
    <div className="stack">
      <p className="muted">{message ?? "Team not found in this project."}</p>
      <Link href={`/staff/projects/${projectId}`} className="pill-nav__link" style={{ width: "fit-content" }}>
        Back to project teams
      </Link>
    </div>
  );
}
