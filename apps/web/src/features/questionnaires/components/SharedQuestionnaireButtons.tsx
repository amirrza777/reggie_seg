
"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/shared/api/http";

const buttonStyle: React.CSSProperties = {
  padding: "10px 20px",
  color: "var(--btn-primary-text)",
  cursor: "pointer",
};


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
};

export function DeleteQuestionnaireButton({
  questionnaireId,
  label = "Delete",
}: DeleteQuestionnaireButtonProps) {
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this questionnaire? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      await apiFetch(`/questionnaires/${questionnaireId}`, {
        method: "DELETE",
      });

      router.push("/staff/questionnaires");
      router.refresh(); // ensures list updates if cached
    } catch (err) {
      console.error(err);
      alert("Delete failed — check console");
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
