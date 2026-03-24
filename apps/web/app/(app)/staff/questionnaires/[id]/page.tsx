"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Placeholder } from "@/shared/ui/Placeholder";
import { SkeletonText } from "@/shared/ui/Skeleton";
import { QuestionnaireView } from "@/features/questionnaires/components/QuestionnaireView";
import { DeleteQuestionnaireButton, EditQuestionnaireButton } from "@/features/questionnaires/components/SharedQuestionnaireButtons";
import { Questionnaire } from "@/features/questionnaires/types";
import { getQuestionnaireById } from "@/features/questionnaires/api/client";
import { logDevError } from "@/shared/lib/devLogger";

export default function QuestionnairePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    getQuestionnaireById(id)
      .then(setQuestionnaire)
      .catch((err) => {
        logDevError(err);
        setError("Failed to load questionnaire.");
      });
  }, [id]);

  if (error) return <div className="ui-page"><p>{error}</p></div>;
  if (!questionnaire) {
    return (
      <div className="ui-page" role="status" aria-live="polite">
        <SkeletonText lines={3} widths={["38%", "92%", "74%"]} />
        <span className="ui-visually-hidden">Loading questionnaire</span>
      </div>
    );
  }

  const canManage = questionnaire.canEdit === true;
  const canUse = questionnaire.isPublic === true && !canManage;

  return (
    <div className="stack ui-page" style={{ gap: 40 }}>
      <Placeholder
        title={`Questionnaire: ${questionnaire.templateName}`}
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
            <button
              className="btn"
              onClick={() => router.push(`/staff/questionnaires/${id}/edit?mode=copy`)}
            >Copy</button>
            <DeleteQuestionnaireButton questionnaireId={id} />
          </>
        )}
        {canUse && (
          <button
            className="btn"
            onClick={() => router.push(`/staff/questionnaires/${id}/edit?mode=use`)}
          >
            Copy Template
          </button>
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
