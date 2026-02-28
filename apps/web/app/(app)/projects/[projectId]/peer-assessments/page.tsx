import {
  getPeerAssessmentsForUser,
  getTeammates,
} from "@/features/peerAssessment/api/client";
import { PeerListView } from "@/features/peerAssessment/components/PeerListView";
import { ProjectNav } from "@/features/projects/components/ProjectNav";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

const tempUserId = 4;
const tempTeamId = 1;

export default async function ProjectPeerAssessmentsPage(props : ProjectPageProps) {
  const { projectId } = await props.params;

  const [peers, assessments] = await Promise.all([
    getTeammates(tempUserId, tempTeamId),
    getPeerAssessmentsForUser(tempUserId, Number(projectId)),
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
    <div className="stack">
      <ProjectNav projectId={projectId} />
       <div style={{ padding: "30px" }}>
      <h2> Peer Assessments</h2>
      <p>Assess your teammates for this project.</p>
        <PeerListView
          peers={peers}
          projectId={projectId}
          teamId={tempTeamId}
          currentUserId={tempUserId}
          completedRevieweeIds={completedRevieweeIds}
          completedAssessmentByRevieweeId={completedAssessmentByRevieweeId}
        />
      </div>
    </div>
  );   
}
