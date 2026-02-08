import { redirect } from "next/navigation";
import { PeerAssessmentForm } from "@/features/peerAssessment/components/PeerAssessmentForm";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getQuestionsForProject, getPeerAssessmentData } from "@/features/peerAssessment/api/client";
import type { PeerAssessment } from "@/features/peerAssessment/types";

type CreatePageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};
 //`/projects/${projectId}/peer-assessments/create?teamId=${teamId}&revieweeId=${peerId}&reviewerId=${currentUserId}`
export default async function CreateAssessmentPage({
  params,
  searchParams,
}: CreatePageProps) {
  const { projectId: pId } = await params;
  const sp = await searchParams;
  const projectIdNum = parseInt(pId);
  const teamId = parseInt(sp.teamId as string);
  const revieweeId = parseInt(sp.revieweeId as string);
  const reviewerId = parseInt(sp.reviewerId as string);

    try {
      const existingAssessment = await getPeerAssessmentData(
        1, // moduleId - placeholder, adjust if needed
        projectIdNum,
        teamId,
        reviewerId,
        revieweeId
      );
      if (existingAssessment) {
        redirect(`/projects/${pId}/peer-assessments/${existingAssessment.id}`);
      }
    } catch (error) {
    const questions = await getQuestionsForProject(pId);

    return (
      <div className="stack">
        <ProjectNav projectId={pId} />
        <div style={{ padding: "20px" }}>
          <h1>Create Peer Assessment</h1>
          {questions.length > 0 && (
            <PeerAssessmentForm
              teamName="Team"
              teammateName="Peer"
              questions={questions}
              moduleId={1}
              projectId={projectIdNum}
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
}