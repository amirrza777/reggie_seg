"use client";

import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { deleteQuestionnaire } from "../api/client";

type QuestionnaireVisibilityButtonsProps = {
  isPublic: boolean;
  onChange: (next: boolean) => void;
};

type CancelQuestionnaireButtonProps = {
  onCancel: () => void;
  label?: string;
  className?: string;
  confirmWhen?: boolean;
  confirmMessage?: string;
};

export function QuestionnaireVisibilityButtons({
  isPublic,
  onChange,
}: QuestionnaireVisibilityButtonsProps) {
  return (
    <div className="questionnaire-visibility">
      <span className="questionnaire-visibility__label">Visibility:</span>
      <Button
        type="button"
        variant={isPublic ? "primary" : "quiet"}
        className={`questionnaire-visibility__btn${isPublic ? " is-active" : ""}`}
        onClick={() => onChange(true)}
      >
        Public
      </Button>
      <Button
        type="button"
        variant={!isPublic ? "primary" : "quiet"}
        className={`questionnaire-visibility__btn${!isPublic ? " is-active" : ""}`}
        onClick={() => onChange(false)}
      >
        Private
      </Button>
    </div>
  );
}

export function CancelQuestionnaireButton({
  onCancel,
  label = "Cancel",
  className,
  confirmWhen = false,
  confirmMessage = "You have unsaved changes. Are you sure you want to exit without saving?",
}: CancelQuestionnaireButtonProps) {
  return (
    <Button
      type="button"
      variant="quiet"
      className={className}
      onClick={() => {
        if (confirmWhen && !window.confirm(confirmMessage)) return;
        onCancel();
      }}
    >
      {label}
    </Button>
  );
}

type EditQuestionnaireButtonProps = {
  questionnaireId: number | string;
  label?: string;
};

export function EditQuestionnaireButton({
  questionnaireId,
  label = "Edit",
}: EditQuestionnaireButtonProps) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="quiet"
      onClick={() => router.push(`/staff/questionnaires/${questionnaireId}/edit`)}
    >
      {label}
    </Button>
  );
}

type DeleteQuestionnaireButtonProps = {
  questionnaireId: number | string;
  label?: string;
  onDeleted?: (questionnaireId: number | string) => void;
};

export function DeleteQuestionnaireButton({
  questionnaireId,
  label = "Delete",
  onDeleted,
}: DeleteQuestionnaireButtonProps) {
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this questionnaire? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      await deleteQuestionnaire(questionnaireId);

      if (onDeleted) {
        onDeleted(questionnaireId);
        return;
      }

      router.push("/staff/questionnaires");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
        return;
      }
      console.error(err);
      alert("Delete failed - check console");
    }
  };

  return (
    <Button type="button" variant="danger" onClick={handleDelete}>
      {label}
    </Button>
  );
}
