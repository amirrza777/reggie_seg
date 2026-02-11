import Link from "next/link";
import { apiFetch } from "@/shared/api/http";
import { Placeholder } from "@/shared/ui/Placeholder";
import { QuestionnaireView } from "@/features/questionnaires/components/QuestionnaireView";
import { DeleteQuestionnaireButton, EditQuestionnaireButton } from "@/features/questionnaires/components/SharedQuestionnaireButtons";
import { Questionnaire } from "@/features/questionnaires/types";

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

        <EditQuestionnaireButton questionnaireId={id} />
        <DeleteQuestionnaireButton questionnaireId={id} />


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
