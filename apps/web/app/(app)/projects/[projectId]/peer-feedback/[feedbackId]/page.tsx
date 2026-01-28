import { Placeholder } from "@/shared/ui/Placeholder";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { FeedbackView } from "@/features/peerFeedback/components/FeedbackView";
import type { Answer } from "@/features/peerFeedback/types";
import { apiFetch } from "@/shared/api/http";

type ProjectPageProps = {
  params: Promise<{
    feedbackId: string;
    projectId: string;
  }>;
};

async function getPeerFeedback(feedbackId: string): Promise<Questionnaire> {
  return apiFetch(`/peer-assessments/${feedbackId}`);
}

export default async function PeerFeedbackReview({ params }: ProjectPageProps) {
  const { feedbackId, projectId } = await params;
  const feedback = await getPeerFeedback(feedbackId);
  const feedbackData = await feedback.json();
  const awnsers = feedbackData.awnsers as Answer[];
  return (
    <div> 
      <FeedbackView awnsers={awnsers}/>
    </div>
  );
}
