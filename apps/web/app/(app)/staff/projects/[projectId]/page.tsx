import Link from "next/link";
import { getStaffProjectManage } from "@/features/projects/api/client";
import { ProjectDeadlinesScheduleCard, InformationBoardCard } from "@/features/projects/components/ProjectOverviewDashboard";
import type { ProjectDeadline, StaffProjectManageDeadlineSnapshot } from "@/features/projects/types";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { getCurrentUser } from "@/shared/auth/session";
import { StaffTeamCard } from "@/features/staff/projects/components/StaffTeamCard";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffProjectTeamsPageProps = {
  params: Promise<{ projectId: string }>;
};

function manageDeadlineToProjectDeadline(snapshot: StaffProjectManageDeadlineSnapshot | null): ProjectDeadline {
  if (!snapshot) {
    return {
      taskOpenDate: null,
      taskDueDate: null,
      assessmentOpenDate: null,
      assessmentDueDate: null,
      feedbackOpenDate: null,
      feedbackDueDate: null,
      isOverridden: false,
    };
  }
  return {
    taskOpenDate: snapshot.taskOpenDate,
    taskDueDate: snapshot.taskDueDate,
    taskDueDateMcf: snapshot.taskDueDateMcf,
    assessmentOpenDate: snapshot.assessmentOpenDate,
    assessmentDueDate: snapshot.assessmentDueDate,
    assessmentDueDateMcf: snapshot.assessmentDueDateMcf,
    feedbackOpenDate: snapshot.feedbackOpenDate,
    feedbackDueDate: snapshot.feedbackDueDate,
    feedbackDueDateMcf: snapshot.feedbackDueDateMcf,
    teamAllocationQuestionnaireOpenDate: snapshot.teamAllocationQuestionnaireOpenDate,
    teamAllocationQuestionnaireDueDate: snapshot.teamAllocationQuestionnaireDueDate,
    teamAllocationInviteDueDate: snapshot.teamAllocationInviteDueDate,
    isOverridden: false,
  };
}

export default async function StaffProjectTeamsPage({ params }: StaffProjectTeamsPageProps) {
  const { projectId } = await params;
  const numericProjectId = Number(projectId);
  const userId = (await getCurrentUser())!.id;
  const [data, manage] = await Promise.all([
    getStaffProjectTeams(userId, numericProjectId),
    getStaffProjectManage(numericProjectId),
  ]);
  const projectDeadline = manageDeadlineToProjectDeadline(manage.projectDeadline);

  return (
    <>
      <div className="stack">
        <InformationBoardCard informationText={data.project.informationText ?? null} />
        <div className="staff-projects__overview-info-actions">
          <Link href={`/staff/projects/${encodeURIComponent(projectId)}/manage`} className="btn btn--sm btn--primary">
            Edit text
          </Link>
        </div>
        <ProjectDeadlinesScheduleCard project={data.project} deadline={projectDeadline} emphasize />
        <div className="staff-projects__overview-info-actions">
          <Link href={`/staff/projects/${encodeURIComponent(projectId)}/manage`} className="btn btn--sm btn--primary">
            Adjust deadlines
          </Link>
        </div>
      </div>
      {data.teams.length === 0 ? <p className="muted">No teams exist in this project yet.</p> : null}
      <section className="staff-projects__team-list" aria-label="Project teams">
        {data.teams.map((team) => (
          <StaffTeamCard key={team.id} team={team} projectId={data.project.id} />
        ))}
      </section>
    </>
  );
}
