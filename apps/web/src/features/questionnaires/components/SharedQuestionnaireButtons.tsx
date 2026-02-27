
"use client";

import { useRouter } from "next/navigation";
import { deleteQuestionnaire } from "../api/client";
import { ApiError } from "@/shared/api/errors";

const buttonStyle: React.CSSProperties = {
  padding: "10px 20px",
  color: "var(--btn-primary-text)",
  cursor: "pointer",
};

type QuestionnaireVisibilityButtonsProps = {
  isPublic: boolean;
  onChange: (next: boolean) => void;
};

type CancelQuestionnaireButtonProps = {
  onCancel: () => void;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  confirmWhen?: boolean;
  confirmMessage?: string;
};

export function QuestionnaireVisibilityButtons({
  isPublic,
  onChange,
}: QuestionnaireVisibilityButtonsProps) {
  return (
    <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 12, opacity: 0.75 }}>Visibility:</span>
      <button
        type="button"
        style={{
          borderColor: isPublic ? "var(--btn-primary-border)" : "var(--border)",
          background: isPublic ? "var(--btn-primary-bg)" : "var(--glass-hover)",
          color: isPublic ? "var(--btn-primary-text)" : "var(--ink)",
        }}
        className="btn"
        onClick={() => onChange(true)}
      >
        Public
      </button>
      <button
        type="button"
        style={{
          borderColor: !isPublic ? "var(--btn-primary-border)" : "var(--border)",
          background: !isPublic ? "var(--btn-primary-bg)" : "var(--glass-hover)",
          color: !isPublic ? "var(--btn-primary-text)" : "var(--ink)",
        }}
        className="btn"
        onClick={() => onChange(false)}
      >
        Private
      </button>
    </div>
  );
}

export function CancelQuestionnaireButton({
  onCancel,
  label = "Cancel",
  className = "btn",
  style,
  confirmWhen = false,
  confirmMessage = "You have unsaved changes. Are you sure you want to exit without saving?",
}: CancelQuestionnaireButtonProps) {
  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={() => {
        if (confirmWhen && !window.confirm(confirmMessage)) return;
        onCancel();
      }}
    >
      {label}
    </button>
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
    <button
      className="btn"
      style = {buttonStyle}
      onClick={() =>
        router.push(`/staff/questionnaires/${questionnaireId}/edit`)
      }
    >
      {label}
    </button>
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
      router.refresh(); // ensures list updates if cached
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
    <button 
    className="btn btn-danger" 
    style = {buttonStyle}
    onClick={handleDelete}>
      {label}
    </button>
  );
}
