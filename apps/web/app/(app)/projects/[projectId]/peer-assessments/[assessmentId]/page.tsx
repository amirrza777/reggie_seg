import { PeerAssessmentForm } from "@/features/peerAssessment/components/PeerAssessmentForm";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getProjectNavFlags } from "@/features/projects/navFlags";
import { getPeerAssessmentById, getQuestionsByProject } from "@/features/peerAssessment/api/client";
import { getProjectDeadline } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";

type AssessmentPageProps = {
  params: Promise<{ projectId: string; assessmentId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AssessmentPage({params, searchParams}: AssessmentPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { projectId , assessmentId } = resolvedParams;
  const user = await getCurrentUser();
  const navFlags = await getProjectNavFlags(user?.id, Number(projectId));
  
  const assessment = await getPeerAssessmentById(Number(assessmentId));
  const questions = await getQuestionsByProject(String(projectId));
  let assessmentDeadline: string | null = null;
  if (user) {
    try {
      const deadline = await getProjectDeadline(user.id, Number(projectId));
      assessmentDeadline = deadline.assessmentDueDate;
    } catch {
      assessmentDeadline = null;
    }
  }

  const assessmentIdNum = Number(assessmentId);
  const teammateName = (resolvedSearchParams.teammateName as string) || `${assessment.firstName} ${assessment.lastName}`;

  return (
    <div className="stack stack--tabbed">
      <ProjectNav projectId={projectId} enabledFlags={navFlags} />
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
            assessmentDeadline={assessmentDeadline}
          />
        ) : (
          <p>No questions found</p>
        )}
      </div>
    </div>
  );
}
