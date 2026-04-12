"use client";

import { TitleWithInfoModal } from "@/shared/ui/TitleWithInfoModal";

type ProjectTeamHealthTitleWithInfoProps = {
  title?: string;
};

export function ProjectTeamHealthTitleWithInfo({
  title = "Team Health",
}: ProjectTeamHealthTitleWithInfoProps) {
  return (
    <TitleWithInfoModal
      title={title}
      buttonLabel="What is team health?"
      modalTitle="Team health"
      paragraphs={[
        "Team health gives you a quick view of warnings and support messages for your team in this project.",
        "Warnings are generated from project warning rules set by staff, for example low meeting activity or low contribution signals.",
        "Use messages to raise concerns, ask for support, and track staff responses in one place.",
      ]}
    />
  );
}
