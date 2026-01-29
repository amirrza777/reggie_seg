import type { PeerFeedback , Answer} from "@/features/peerFeedback/types";
import { FeedbackView } from "@/features/peerFeedback/components/FeedbackView";
import { getPeerFeedbackById } from "@/features/peerFeedback/api/client";

type ProjectPageProps = {
  params: Promise<{
    feedbackId: string;
    projectId: string;
  }>;
};

export default async function PeerFeedbackReview({ params }: ProjectPageProps) {
  const { feedbackId, projectId } = await params;
  const feedback : PeerFeedback = await getPeerFeedbackById(feedbackId);
  const awnsers = feedback.answers as Answer[];
  return (
    <div> 
      <FeedbackView answers={awnsers}/>
    </div>
  );
}
