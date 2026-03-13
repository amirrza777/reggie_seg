import {
  getPeerAssessmentsForUser,
  getTeammates,
} from "@/features/peerAssessment/api/client";
import { PeerListView } from "@/features/peerAssessment/components/PeerListView";
import { getTeamByUserAndProject } from "@/features/projects/api/client";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getCurrentUser } from "@/shared/auth/session";
import { getFeatureFlagMap } from "@/shared/featureFlags";
import Link from "next/link";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPeerAssessmentsPage(props : ProjectPageProps) {
  const { projectId } = await props.params;
  const numericProjectId = Number(projectId);
  const user = await getCurrentUser();
  const flagMap = await getFeatureFlagMap();

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
      <div className="stack stack--tabbed">
        <ProjectNav projectId={projectId} enabledFlags={flagMap} />
        <div style={{ padding: 24 }}>
          <p>You are not in a team for this project.</p>
          <Link href={`/projects/${projectId}`}>← Back to project</Link>
        </div>
      </div>
    );
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
    <div className="stack stack--tabbed">
      <ProjectNav projectId={projectId} enabledFlags={flagMap} />
       <div style={{ padding: "30px" }}>
      <h2> Peer Assessments</h2>
      <p>Assess your teammates for this project.</p>
        <PeerListView
          peers={peers}
          projectId={projectId}
          teamId={team.id}
          currentUserId={user.id}
          completedRevieweeIds={completedRevieweeIds}
          completedAssessmentByRevieweeId={completedAssessmentByRevieweeId}
        />
      </div>
    </div>
  );   
}
