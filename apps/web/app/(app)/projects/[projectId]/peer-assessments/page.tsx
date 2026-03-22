import {
  getPeerAssessmentsForUser,
  getTeammates,
} from "@/features/peerAssessment/api/client";
import { PeerListView } from "@/features/peerAssessment/components/PeerListView";
import { getProjectDeadline, getTeamByUserAndProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import Link from "next/link";
import { PageSection } from "@/shared/ui/PageSection";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPeerAssessmentsPage(props : ProjectPageProps) {
  const { projectId } = await props.params;
  const numericProjectId = Number(projectId);
  const user = await getCurrentUser();

  let team: Awaited<ReturnType<typeof getTeamByUserAndProject>> | null = null;
  if (user && !Number.isNaN(numericProjectId)) {
    try {
      team = await getTeamByUserAndProject(user.id, numericProjectId);
    } catch {
      team = null;
    }
  }

  if (!user || !team) {
    return (
      <PageSection
        title="Peer Assessments"
        description="Assess your teammates for this project."
        className="ui-page--project"
      >
        <p>You are not in a team for this project.</p>
        <Link href={`/projects/${projectId}`}>← Back to project</Link>
      </PageSection>
    );
  }

  let readOnly = false;
  try {
    const deadline = await getProjectDeadline(user.id, numericProjectId);
    const dueAt = deadline.assessmentDueDate ? new Date(deadline.assessmentDueDate) : null;
    const now = new Date();
    readOnly = Boolean(dueAt && !Number.isNaN(dueAt.getTime()) && dueAt.getTime() < now.getTime());
  } catch {
    readOnly = false;
  }

  const [peers, assessments] = await Promise.all([
    getTeammates(user.id, team.id),
    getPeerAssessmentsForUser(user.id, numericProjectId),
  ]);
  const latestAssessmentByRevieweeId = new Map<number, { id: number; submittedAt: string }>();
  for (const assessment of assessments) {
    const assessmentId = Number(assessment.id);
    if (!Number.isFinite(assessmentId)) continue;

    const existing = latestAssessmentByRevieweeId.get(assessment.revieweeUserId);
    if (!existing) {
      latestAssessmentByRevieweeId.set(assessment.revieweeUserId, {
        id: assessmentId,
        submittedAt: assessment.submittedAt,
      });
      continue;
    }

    if (
      new Date(assessment.submittedAt).getTime() >
      new Date(existing.submittedAt).getTime()
    ) {
      latestAssessmentByRevieweeId.set(assessment.revieweeUserId, {
        id: assessmentId,
        submittedAt: assessment.submittedAt,
      });
    }
  }

  const completedRevieweeIds = Array.from(latestAssessmentByRevieweeId.keys());
  const completedAssessmentByRevieweeId = Object.fromEntries(
    Array.from(latestAssessmentByRevieweeId.entries()).map(([revieweeId, data]) => [
      revieweeId,
      data.id,
    ])
  );

  return (
    <PageSection
      title="Peer Assessments"
      description="Assess your teammates for this project."
      className="ui-page--project"
    >
      <PeerListView
        peers={peers}
        projectId={projectId}
        teamId={team.id}
        currentUserId={user.id}
        completedRevieweeIds={completedRevieweeIds}
        completedAssessmentByRevieweeId={completedAssessmentByRevieweeId}
        readOnly={readOnly}
      />
    </PageSection>
  );
}
