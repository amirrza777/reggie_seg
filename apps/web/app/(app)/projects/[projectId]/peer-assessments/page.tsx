import {
  getPeerAssessmentsForUser,
  getTeammates,
} from "@/features/peerAssessment/api/client";
import { PeerListView } from "@/features/peerAssessment/components/PeerListView";
import { PeerAssessmentTitleWithInfo } from "@/features/peerAssessment/components/PeerAssessmentTitleWithInfo";
import { getProjectDeadline, getTeamByUserAndProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { PageSection } from "@/shared/ui/PageSection";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

function formatDeadlineLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildAssessmentGuidance(
  assessmentDueDate: string | null | undefined,
  assessmentDueDateMcf: string | null | undefined,
): string {
  const dueLabel = formatDeadlineLabel(assessmentDueDate);
  const extensionDueLabel = formatDeadlineLabel(assessmentDueDateMcf);

  if (dueLabel && extensionDueLabel) {
    return `The deadline for submitting peer assessments is ${dueLabel}. If you are unable to meet this deadline for valid reasons, you may apply for an extension. Late submissions or assessment changes are accepted until ${extensionDueLabel}, but will be deemed late unless an extension is approved.`;
  }

  if (dueLabel) {
    return `The deadline for submitting peer assessments is ${dueLabel}. Please complete your reviews before the deadline.`;
  }

  return "Complete all required peer assessments for your teammates in this list.";
}

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
        title={<PeerAssessmentTitleWithInfo title="Peer Assessments" />}
        className="ui-page--project"
      >
        <p>You are not in a team for this project.</p>
      </PageSection>
    );
  }

  const [deadline, peers, assessments] = await Promise.all([
    getProjectDeadline(user.id, numericProjectId).catch(() => null),
    getTeammates(user.id, team.id),
    getPeerAssessmentsForUser(user.id, numericProjectId),
  ]);
  const readOnly = (() => {
    if (!deadline?.assessmentDueDate) return false;
    const dueAt = new Date(deadline.assessmentDueDate);
    if (Number.isNaN(dueAt.getTime())) return false;
    return dueAt.getTime() < Date.now();
  })();
  const listDescription = buildAssessmentGuidance(
    deadline?.assessmentDueDate,
    deadline?.assessmentDueDateMcf ?? null,
  );
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
      title={<PeerAssessmentTitleWithInfo title="Peer Assessments" />}
      className="ui-page--project"
    >
      <PeerListView
        peers={peers}
        projectId={projectId}
        teamId={team.id}
        currentUserId={user.id}
        listTitle="List of peer assessments"
        listDescription={listDescription}
        completedRevieweeIds={completedRevieweeIds}
        completedAssessmentByRevieweeId={completedAssessmentByRevieweeId}
        readOnly={readOnly}
      />
    </PageSection>
  );
}
