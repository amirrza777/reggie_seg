"use client";

import { TitleWithInfoModal } from "@/shared/ui/TitleWithInfoModal";

type PeerFeedbackTitleWithInfoProps = {
  title?: string;
};

export function PeerFeedbackTitleWithInfo({
  title = "Peer Feedback",
}: PeerFeedbackTitleWithInfoProps) {
  return (
    <TitleWithInfoModal
      title={title}
      buttonLabel="What is peer feedback?"
      modalTitle="Peer feedback"
      paragraphs={[
        "Peer feedback is where you respond to the reviews your teammates submitted about your contribution and collaboration during the project.",
        "Your response helps provide context and supports a fairer understanding of team dynamics during moderation and staff review.",
        "Keep responses professional and specific. Focus on clarifying context, acknowledging useful feedback, and outlining improvements where relevant.",
      ]}
    />
  );
}
