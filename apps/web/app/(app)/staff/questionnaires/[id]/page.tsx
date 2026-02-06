import Link from "next/link";
import { apiFetch } from "@/shared/api/http";
import { Placeholder } from "@/shared/ui/Placeholder";
import { QuestionnaireView } from "@/features/questionnaires/components/QuestionnaireView";
import { Questionnaire, Question } from "@/features/questionnaires/types";

type PageProps = {
  params: { id: string };
};

async function getQuestionnaire(id: string): Promise<Questionnaire> {
  return apiFetch(`/questionnaires/${id}`);
}

export default async function QuestionnairePage({ params }: PageProps) {
  const { id } = await params;
  const questionnaire: Questionnaire = await getQuestionnaire(id);

  return (
    <div className="stack" style={{ padding: 32, gap: 24 }}>

      <Placeholder
        title={`Questionnaire: ${questionnaire.templateName}`}
        path={`/staff/questionnaires/${id}`}
        description="View the questions and details of this template."
      />
      <QuestionnaireView questionnaire={questionnaire} />


      <Link href="/staff/questionnaires">
        <button
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--btn-primary-border)",
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-text)",
            cursor: "pointer",
          }}
        >
          Back to all questionnaires
        </button>
      </Link>
    </div>
  );
}
