"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Placeholder } from "@/shared/ui/Placeholder";
import { QuestionnaireView } from "@/features/questionnaires/components/QuestionnaireView";
import { DeleteQuestionnaireButton, EditQuestionnaireButton } from "@/features/questionnaires/components/SharedQuestionnaireButtons";
import { Questionnaire } from "@/features/questionnaires/types";
import { getQuestionnaireById } from "@/features/questionnaires/api/client";

export default function QuestionnairePage() {
  const { id } = useParams<{ id: string }>();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    getQuestionnaireById(id)
      .then(setQuestionnaire)
      .catch((err) => {
        console.error(err);
        setError("Failed to load questionnaire.");
      });
  }, [id]);

  if (error) return <p style={{ padding: 32 }}>{error}</p>;
  if (!questionnaire) return <p style={{ padding: 32 }}>Loading...</p>;

  const canManage = questionnaire.canEdit === true;

  return (
    <div className="stack" style={{ padding: 32, gap: 40 }}>
      <Placeholder
        title={`Questionnaire: ${questionnaire.templateName}`}
        path={`/staff/questionnaires/${id}`}
        description="View the questions and details of this template."
      />
      <QuestionnaireView questionnaire={questionnaire} />

      <div
        style={{
          display: "flex",
          gap: "20px",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          width: "100%",
        }}
      >
        {canManage && (
          <>
            <EditQuestionnaireButton questionnaireId={id} />
            <DeleteQuestionnaireButton questionnaireId={id} />
          </>
        )}

        <Link href="/staff/questionnaires" style={{ marginLeft: 100 }}>
          <button
            style={{
              padding: "10px 20px",
              border: "1px solid var(--btn-primary-border)",
              background: "var(--btn-primary-bg)",
              color: "var(--btn-primary-text)",
              cursor: "pointer",
            }}
            className="btn"
          >
            Back to all questionnaires
          </button>
        </Link>
      </div>
    </div>
  );
}
