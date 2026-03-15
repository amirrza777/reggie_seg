import { PeerAssessmentForm } from "@/features/peerAssessment/components/PeerAssessmentForm";
import { getPeerAssessmentById, getQuestionsByProject } from "@/features/peerAssessment/api/client";
import { getProjectDeadline } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";

type AssessmentPageProps = {
  params: Promise<{ projectId: string; assessmentId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AssessmentPage({ params, searchParams }: AssessmentPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { projectId, assessmentId } = resolvedParams;
  const user = await getCurrentUser();

  const assessment = await getPeerAssessmentById(Number(assessmentId));
  const questions = await getQuestionsByProject(String(projectId));
  let assessmentOpenAt: string | null = null;
  let assessmentDueAt: string | null = null;

  if (user) {
    try {
      const deadline = await getProjectDeadline(user.id, Number(projectId));
      assessmentOpenAt = deadline.assessmentOpenDate;
      assessmentDueAt = deadline.assessmentDueDate;
    } catch {
      // Form still submits against backend guard if deadline endpoint is unavailable.
    }
  }

  const assessmentIdNum = Number(assessmentId);
  const teammateName = (resolvedSearchParams.teammateName as string) || `${assessment.firstName} ${assessment.lastName}`;

  return (
    <div style={{ padding: "20px" }}>
      {questions.length > 0 ? (
        <PeerAssessmentForm
          title="Edit Peer Assessment"
          teammateName={teammateName}
          questions={questions}
          projectId={Number(projectId)}
          teamId={assessment.teamId}
          templateId={assessment.templateId}
          reviewerId={assessment.reviewerUserId}
          revieweeId={assessment.revieweeUserId}
          initialAnswers={assessment.answers}
          assessmentId={assessmentIdNum}
          assessmentOpenAt={assessmentOpenAt}
          assessmentDueAt={assessmentDueAt}
        />
      ) : (
        <p>No questions found</p>
      )}
    </div>
  );
}
