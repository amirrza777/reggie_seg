import { PeerAssessmentForm } from "@/features/peerAssessment/components/PeerAssessmentForm";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getQuestionsForProject, getPeerAssessmentById } from "@/features/peerAssessment/api/client";



type AssessmentPageProps = {
  params: Promise<{ projectId: string; assessmentId: string }>;
};

export default async function AssessmentPage({params,}: AssessmentPageProps) {
  const { projectId , assessmentId } = await params;
  console.log("AssessmentPage - assessmentId from params:", assessmentId);
  
  const assessment = await getPeerAssessmentById(Number(assessmentId));
  const questions = await getQuestionsForProject(String(projectId));

  const assessmentIdNum = Number(assessmentId);
  console.log("AssessmentPage - converted assessmentId:", assessmentIdNum);
  console.log("AssessmentPage - questions length:", questions.length);
  console.log("AssessmentPage - questions:", questions);

  return (
    <div className="stack">
      <ProjectNav projectId={projectId} />
      <div style={{ padding: "20px" }}>
        <h2>Edit Peer Assessment {assessment.firstName} {assessment.lastName}</h2>
        {questions.length > 0 ? (
          <PeerAssessmentForm
            teamName="Team"
            teammateName="Peer"
            questions={questions}
            moduleId={assessment.moduleId} 
            projectId={Number(projectId)}
            teamId={assessment.teamId}
            templateId={assessment.templateId}
            reviewerId={assessment.reviewerUserId}
            revieweeId={assessment.revieweeUserId}
            initialAnswers={assessment.answers}
            assessmentId={assessmentIdNum}
          />
        ) : (
          <p>No questions found</p>
        )}
      </div>
    </div>
  );
}
