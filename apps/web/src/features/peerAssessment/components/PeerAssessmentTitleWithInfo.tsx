"use client";

import { TitleWithInfoModal } from "@/shared/ui/TitleWithInfoModal";

type PeerAssessmentTitleWithInfoProps = {
  title?: string;
};

export function PeerAssessmentTitleWithInfo({
  title = "Peer Assessments",
}: PeerAssessmentTitleWithInfoProps) {
  return (
    <TitleWithInfoModal
      title={title}
      buttonLabel="What is peer assessment?"
      modalTitle="Peer assessments"
      paragraphs={[
        "Peer assessment is where you evaluate your teammates' contribution and collaboration during the project lifecycle. Your comments should reflect observed contribution quality, communication, and reliability.",
        "These responses help create a fairer evidence base for team contribution. Staff may use the submitted reviews as supporting context during moderation and feedback discussions.",
        "Submit clear, professional feedback that focuses on behavior and delivery outcomes. Avoid personal language and keep your assessment factual and constructive.",
      ]}
    />
  );
}
