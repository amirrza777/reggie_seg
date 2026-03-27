"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { ConfirmationModal } from "@/shared/ui/ConfirmationModal";
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="quiet"
        className={className}
        onClick={() => {
          if (confirmWhen) {
            setConfirmOpen(true);
            return;
          }
          onCancel();
        }}
      >
        {label}
      </Button>
      <ConfirmationModal
        open={confirmOpen}
        title="Discard unsaved changes?"
        message={confirmMessage}
        cancelLabel="Stay here"
        confirmLabel="Exit without saving"
        confirmVariant="danger"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onCancel();
        }}
      />
    </>
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setConfirmOpen(false);
    setDeleteError(null);
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
        setDeleteError(err.message);
        return;
      }
      console.error(err);
      setDeleteError("Delete failed - check console");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="danger"
        onClick={() => {
          setDeleteError(null);
          setConfirmOpen(true);
        }}
        disabled={deleting}
      >
        {label}
      </Button>
      {deleteError ? <p className="ui-note ui-note--error">{deleteError}</p> : null}
      <ConfirmationModal
        open={confirmOpen}
        title="Delete questionnaire?"
        message="Are you sure you want to delete this questionnaire? This action cannot be undone."
        cancelLabel="Cancel"
        confirmLabel={deleting ? "Deleting..." : "Delete questionnaire"}
        confirmVariant="danger"
        busy={deleting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
