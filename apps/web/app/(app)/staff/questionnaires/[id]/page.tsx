"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Placeholder } from "@/shared/ui/Placeholder";
import { SkeletonText } from "@/shared/ui/skeletons/Skeleton";
import { Breadcrumbs } from "@/shared/layout/Breadcrumbs";
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
      <Breadcrumbs
        items={[
          { label: "Staff", href: "/staff" },
          { label: "Questionnaires", href: "/staff/questionnaires" },
          { label: questionnaire.templateName },
        ]}
      />
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
      </div>
    </div>
  );
}
