import Link from "next/link";
import { getStaffTeamHealthMessages, getStaffTeamWarnings } from "@/features/projects/api/client";
import { listTeamMeetings } from "@/features/staff/meetings/api/client";
import { getStudentDetails, getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { getTeamBoard } from "@/features/trello/api/client";
import { countCardsByStatus } from "@/features/trello/lib/velocity";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import type { TeamHealthMessage } from "@/features/projects/types";
import {
  average,
  formatCount,
  formatMessageDate,
  formatPercent,
  getAssessmentCompletion,
  getAttendanceRate,
  getInitials,
  getMemberAttendancePercentByUserId,
  loadMemberFeedbackProgress,
  loadProjectCommitTotalsByTeam,
  percentage,
  type MemberFeedbackProgress,
  type TeamOverviewMetrics,
} from "./page.helpers";

type StaffProjectTeamTabsPageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};
export default async function StaffProjectTeamTabsPage({ params }: StaffProjectTeamTabsPageProps) {
  const { projectId, teamId } = await params;
  const userId = (await getCurrentUser())!.id;
  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);
  if (Number.isNaN(numericProjectId) || Number.isNaN(numericTeamId)) {
    return <p className="muted">Invalid project or team ID.</p>;
  }

  let data: Awaited<ReturnType<typeof getStaffProjectTeams>> | null = null;
  let errorMessage: string | null = null;
  try {
    data = await getStaffProjectTeams(userId, numericProjectId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load team data.";
  }

  const team = data?.teams.find((item) => item.id === numericTeamId);

  if (!data || !team) {
    return (
      <div className="stack">
        <p className="muted">{errorMessage ?? "Team not found in this project."}</p>
      </div>
    );
  }

  let teamVsAverage: { team: TeamOverviewMetrics; average: TeamOverviewMetrics } | null = null;
  let assessmentByUserId = new Map<number, { submitted: number; expected: number }>();
  let feedbackByUserId = new Map<number, MemberFeedbackProgress>();
  let attendanceByUserId = new Map<number, number | null>();
  let finalMarkByUserId = new Map<number, number | null>();
  let newMessages: TeamHealthMessage[] = [];

  try {
    const teamDetails = await getTeamDetails(userId, data.project.moduleId, numericTeamId);
    assessmentByUserId = new Map(
      teamDetails.students
        .filter((student): student is typeof student & { id: number } => student.id != null)
        .map((student) => [
          student.id,
          {
            submitted: Number(student.submitted) || 0,
            expected: Number(student.expected) || 0,
          },
        ]),
    );
  } catch {
    assessmentByUserId = new Map();
  }

  try {
    feedbackByUserId = await loadMemberFeedbackProgress(
      numericProjectId,
      team.allocations.map((allocation) => allocation.userId),
    );
  } catch {
    feedbackByUserId = new Map();
  }

  try {
    const teamMeetings = await listTeamMeetings(numericTeamId);
    attendanceByUserId = getMemberAttendancePercentByUserId(teamMeetings);
  } catch {
    attendanceByUserId = new Map();
  }

  try {
    const markResults = await Promise.allSettled(
      team.allocations.map((allocation) =>
        getStudentDetails(userId, data.project.moduleId, numericTeamId, allocation.userId),
      ),
    );

    finalMarkByUserId = new Map(
      team.allocations.map((allocation, index) => {
        const result = markResults[index];
        if (result.status !== "fulfilled") {
          return [allocation.userId, null] as const;
        }
        return [allocation.userId, result.value.studentMarking?.mark ?? null] as const;
      }),
    );
  } catch {
    finalMarkByUserId = new Map();
  }

  try {
    const messages = await getStaffTeamHealthMessages(userId, numericProjectId, numericTeamId);
    newMessages = messages
      .filter((message) => !message.resolved)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  } catch {
    newMessages = [];
  }

  try {
    const teamUserIdsByTeamId = new Map(
      data.teams.map((projectTeam) => [
        projectTeam.id,
        new Set(projectTeam.allocations.map((allocation) => allocation.userId)),
      ]),
    );

    let commitTotalsByTeam = new Map<number, number>();
    try {
      commitTotalsByTeam = await loadProjectCommitTotalsByTeam(numericProjectId, teamUserIdsByTeamId);
    } catch {
      for (const projectTeam of data.teams) {
        commitTotalsByTeam.set(projectTeam.id, 0);
      }
    }

    const perTeamMetrics = await Promise.all(
      data.teams.map(async (projectTeam) => {
        const [teamWarningsResult, teamMeetingsResult, teamAssessmentResult, teamTrelloResult] = await Promise.allSettled([
          getStaffTeamWarnings(userId, numericProjectId, projectTeam.id),
          listTeamMeetings(projectTeam.id),
          getTeamDetails(userId, data.project.moduleId, projectTeam.id),
          getTeamBoard(projectTeam.id),
        ]);

        const totalWarnings =
          teamWarningsResult.status === "fulfilled"
            ? teamWarningsResult.value.length
            : null;

        const meetingCount =
          teamMeetingsResult.status === "fulfilled"
            ? teamMeetingsResult.value.length
            : null;

        const averageAttendance =
          teamMeetingsResult.status === "fulfilled"
            ? getAttendanceRate(teamMeetingsResult.value)
            : null;

        const assessmentCompletion =
          teamAssessmentResult.status === "fulfilled"
            ? getAssessmentCompletion(teamAssessmentResult.value.students)
            : null;

        const trelloCompletionRate =
          teamTrelloResult.status === "fulfilled" && teamTrelloResult.value.ok
            ? (() => {
                const counts = countCardsByStatus(
                  teamTrelloResult.value.view.cardsByList,
                  teamTrelloResult.value.view.listNamesById,
                  teamTrelloResult.value.sectionConfig,
                );
                if (counts.total <= 0) return null;
                return Math.round((counts.completed / counts.total) * 100);
              })()
            : null;

        return [projectTeam.id, {
          totalWarnings,
          assessmentCompletion,
          meetingCount,
          totalRepoCommits: commitTotalsByTeam.get(projectTeam.id) ?? 0,
          averageAttendance,
          trelloCompletionRate,
        } satisfies TeamOverviewMetrics] as const;
      }),
    );

    const metricsByTeamId = new Map(perTeamMetrics);
    const selectedTeamMetrics = metricsByTeamId.get(numericTeamId);

    if (selectedTeamMetrics) {
      const allMetrics = [...metricsByTeamId.values()];
      teamVsAverage = {
        team: selectedTeamMetrics,
        average: {
          totalWarnings: average(allMetrics.map((metric) => metric.totalWarnings)),
          assessmentCompletion: average(allMetrics.map((metric) => metric.assessmentCompletion)),
          meetingCount: average(allMetrics.map((metric) => metric.meetingCount)),
          totalRepoCommits: average(allMetrics.map((metric) => metric.totalRepoCommits)),
          averageAttendance: average(allMetrics.map((metric) => metric.averageAttendance)),
          trelloCompletionRate: average(allMetrics.map((metric) => metric.trelloCompletionRate)),
        },
      };
    }
  } catch {
    teamVsAverage = null;
  }

  return (
    <>

      <section className="staff-projects__team-overview-top" aria-label="Team summary">
        <section className="staff-projects__team-card" aria-label="Team members">
          <h3 style={{ margin: 0 }}>Team members</h3>
          <p className="muted" style={{ margin: 0 }}>
            Use the tabs above to open peer assessment, peer feedback, repositories, meetings, and trello.
          </p>
          {team.allocations.length === 0 ? <p className="muted" style={{ margin: 0 }}>No students assigned yet.</p> : null}
          <div className="staff-projects__members">
            {team.allocations.map((allocation) => {
              const assessmentProgress = assessmentByUserId.get(allocation.userId);
              const feedbackProgress = feedbackByUserId.get(allocation.userId);
              const attendancePercent = attendanceByUserId.get(allocation.userId) ?? null;
              const assessmentPercent = assessmentProgress
                ? percentage(assessmentProgress.submitted, assessmentProgress.expected)
                : null;
              const feedbackPercent = feedbackProgress
                ? percentage(feedbackProgress.completed, feedbackProgress.assigned)
                : null;
              const finalMark = finalMarkByUserId.get(allocation.userId) ?? null;
              return (
                <div key={allocation.userId} className="staff-projects__member">
                  <div className="staff-projects__avatar">
                    {getInitials(allocation.user.firstName, allocation.user.lastName)}
                  </div>
                  <div>
                    <p className="staff-projects__member-name">
                      {allocation.user.firstName} {allocation.user.lastName}
                    </p>
                    <p className="staff-projects__member-email">{allocation.user.email}</p>
                  </div>
                  <div className="staff-projects__member-stats">
                    <div className="staff-projects__member-stat-column">
                      <Link
                        href={`/staff/projects/${projectId}/teams/${teamId}/team-meetings`}
                        className="staff-projects__member-metric-link"
                      >
                        Attendance <strong>{formatPercent(attendancePercent)}</strong>
                      </Link>
                    </div>
                    <div className="staff-projects__member-stat-column">
                      <Link
                        href={`/staff/projects/${projectId}/teams/${teamId}/peer-assessment/${allocation.userId}`}
                        className="staff-projects__member-metric-link"
                      >
                        Assessment <strong>{formatPercent(assessmentPercent)}</strong>
                      </Link>
                      <Link
                        href={`/staff/projects/${projectId}/teams/${teamId}/peer-assessment/${allocation.userId}`}
                        className="staff-projects__member-metric-link"
                      >
                        Feedback <strong>{formatPercent(feedbackPercent)}</strong>
                      </Link>
                    </div>
                    <div className="staff-projects__member-stat-column">
                      <Link
                        href={`/staff/projects/${encodeURIComponent(String(projectId))}/teams/${encodeURIComponent(String(teamId))}/grading/student/${encodeURIComponent(String(allocation.userId))}`}
                        className="staff-projects__member-metric-link"
                      >
                        Final mark <strong>{finalMark == null ? "--" : String(finalMark)}</strong>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="staff-projects__team-overview-side">
          {teamVsAverage ? (
            <article
              className="staff-projects__card staff-projects__card--comparison"
              aria-label="Team versus project average metrics"
            >
              <div className="staff-projects__comparison-head">
                <span>Metric</span>
                <span>Team</span>
                <span>Avg</span>
              </div>
              <div className="staff-projects__comparison-row">
                <span>Total warnings</span>
                <strong>{formatCount(teamVsAverage.team.totalWarnings)}</strong>
                <strong>{formatCount(teamVsAverage.average.totalWarnings)}</strong>
              </div>
              <div className="staff-projects__comparison-row">
                <span>Assessment completion</span>
                <strong>{formatPercent(teamVsAverage.team.assessmentCompletion)}</strong>
                <strong>{formatPercent(teamVsAverage.average.assessmentCompletion)}</strong>
              </div>
              <div className="staff-projects__comparison-row">
                <span>Meetings</span>
                <strong>{formatCount(teamVsAverage.team.meetingCount)}</strong>
                <strong>{formatCount(teamVsAverage.average.meetingCount)}</strong>
              </div>
              <div className="staff-projects__comparison-row">
                <span>Total commits (main)</span>
                <strong>{formatCount(teamVsAverage.team.totalRepoCommits)}</strong>
                <strong>{formatCount(teamVsAverage.average.totalRepoCommits)}</strong>
              </div>
              <div className="staff-projects__comparison-row">
                <span>Average attendance</span>
                <strong>{formatPercent(teamVsAverage.team.averageAttendance)}</strong>
                <strong>{formatPercent(teamVsAverage.average.averageAttendance)}</strong>
              </div>
              <div className="staff-projects__comparison-row">
                <span>Trello completion rate</span>
                <strong>{formatPercent(teamVsAverage.team.trelloCompletionRate)}</strong>
                <strong>{formatPercent(teamVsAverage.average.trelloCompletionRate)}</strong>
              </div>
            </article>
          ) : null}

          <article className="staff-projects__card staff-projects__card--messages-preview" aria-label="New team health messages">
            <div className="staff-projects__team-top">
              <h3 className="staff-projects__team-title" style={{ margin: 0 }}>New messages</h3>
              <Link
                href={`/staff/projects/${projectId}/teams/${teamId}/teamhealth#team-health-messages`}
                className="pill-nav__link"
              >
                Open
              </Link>
            </div>

            {newMessages.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No new messages.
              </p>
            ) : (
              <div className="staff-projects__message-preview-list">
                {newMessages.map((message) => (
                  <Link
                    key={message.id}
                    href={`/staff/projects/${projectId}/teams/${teamId}/teamhealth#team-health-messages`}
                    className="staff-projects__message-preview-link"
                  >
                    <strong>{message.subject}</strong>
                    <span>{formatMessageDate(message.createdAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>
    </>
  );
}
