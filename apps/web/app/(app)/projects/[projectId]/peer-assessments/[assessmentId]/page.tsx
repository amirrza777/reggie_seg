import { PeerAssessmentForm } from "@/features/peerAssessment/components/PeerAssessmentForm";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { getQuestionsForProject } from "@/features/peerAssessment/api/client";
import { aw } from "vitest/dist/chunks/reporters.nr4dxCkA";

const mockQuestions = [
  { id: 1, text: "Confidence:", type: "text" as const, order: 1 },
  { id: 2, text: "Attitude:", type: "text" as const, order: 2 },
  { id: 3, text: "Inclusiveness/respect:", type: "text" as const, order: 3 },
  { id: 4, text: "Preparation:", type: "text" as const, order: 4 },
  { id: 5, text: "Engagement:", type: "text" as const, order: 5 },
  {
    id: 6,
    text: "Regularity of contributions:",
    type: "text" as const,
    order: 6,
  },
  { id: 7, text: "Weight of contributions:", type: "text" as const, order: 7 },
  { id: 8, text: "Feedback for your peer:", type: "text" as const, order: 8 },
];

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPeerAssessmentsPage({
  params,
}: ProjectPageProps) {
  const { projectId } = await params;
  const new_questions = getQuestionsForProject(projectId);

  return (
    <div className="stack">
      <ProjectNav projectId={projectId} />
      <PeerAssessmentForm
        teamName="TeamA"
        teammateName="Colton"
        questions={new_questions}
        moduleId={1}
        projectId={Number(projectId)}
        teamId={1}
        reviewerId={1}
        revieweeId={2}
        templateId={1}
      />
    </div>
  );
}
