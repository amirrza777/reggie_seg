import { redirect } from "next/navigation";
import { PeerAssessmentForm } from "@/features/peerAssessment/components/PeerAssessmentForm";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getPeerAssessmentData, getQuestionsByProject } from "@/features/peerAssessment/api/client";
import { getProject } from "@/features/projects/api/client";
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
    const teammateName = resolvedSearchParams.teammateName;
    let existingAssessment: PeerAssessment | null = null;
    try{
      existingAssessment = await getPeerAssessmentData(
        projectId,
        teamId,
        reviewerId,
        revieweeId
      );
    }
    catch(error: any){
      // 404 is expected when no assessment exists yet 
      if (error?.status !== 404) {
        console.error("Error checking for existing assessment:", error);
      }
    }
    if (existingAssessment) {
        redirect(`/projects/${projectId}/peer-assessments/${existingAssessment.id}?teammateName=${encodeURIComponent(String(teammateName))}`);
    }
    
    const project = await getProject(String(projectId));
    const questions = await getQuestionsByProject(String(projectId));
    console.log(questions);
    console.log("Project data:", project);
    
    return (
      <div className="stack">
        <ProjectNav projectId={String(projectId)} />
        <div style={{ padding: "20px" }}>
          <h2>Create Peer Assessment</h2>
          {questions.length > 0 && (
            <PeerAssessmentForm
              teammateName={String(teammateName)}
              questions={questions}
              projectId={projectId}
              teamId={teamId}
              reviewerId={reviewerId}
              revieweeId={revieweeId}
              templateId={project.questionnaireTemplateId}
            />
          )}
        </div>
      </div>
    );
  }