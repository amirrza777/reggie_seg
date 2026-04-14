"use client";

import { InfoIconModal } from "./InfoIconModal";

type TitleWithInfoModalProps = {
  title: string;
  buttonLabel: string;
  modalTitle: string;
  paragraphs: string[];
  iconStrokeWidth?: number;
};

export function TitleWithInfoModal({
  title,
  buttonLabel,
  modalTitle,
  paragraphs,
  iconStrokeWidth = 2.1,
}: TitleWithInfoModalProps) {
  return (
    <span className="title-info">
      <span>{title}</span>
      <InfoIconModal
        buttonLabel={buttonLabel}
        modalTitle={modalTitle}
        paragraphs={paragraphs}
        iconStrokeWidth={iconStrokeWidth}
      />
    </span>
  );
}
