import { redirect } from "next/navigation";
import { PeerAssessmentForm } from "@/features/peerAssessment/components/PeerAssessmentForm";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getQuestionsForProject, getPeerAssessmentData } from "@/features/peerAssessment/api/client";
import type { PeerAssessment } from "@/features/peerAssessment/types";

type CreatePageProps = {
  params: { projectId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function CreateAssessmentPage(props : CreatePageProps) {
    const resolvedParams = await props.params;
    const resolvedSearchParams = await props.searchParams;
    const projectId = Number(resolvedParams.projectId);
    const teamId = Number(resolvedSearchParams.teamId);
    const revieweeId = Number(resolvedSearchParams.revieweeId);
    const reviewerId = Number(resolvedSearchParams.reviewerId);

    try{
      const existingAssessment = await getPeerAssessmentData(
        projectId,
        teamId,
        reviewerId,
        revieweeId
      );
      if (existingAssessment) {
        redirect(`/projects/${projectId}/peer-assessments/${existingAssessment.id}`);
      }
    }
    catch{}
    
    const questions = await getQuestionsForProject(String(projectId));
    
    return (
      <div className="stack">
        <ProjectNav projectId={String(projectId)} />
        <div style={{ padding: "20px" }}>
          <h1>Create Peer Assessment</h1>
          {questions.length > 0 && (
            <PeerAssessmentForm
              teamName="Team"
              teammateName="Peer"
              questions={questions}
              projectId={projectId}
              teamId={teamId}
              reviewerId={reviewerId}
              revieweeId={revieweeId}
              templateId={1}
            />
          )}
        </div>
      </div>
    );
  }