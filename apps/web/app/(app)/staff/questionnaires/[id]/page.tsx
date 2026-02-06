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
    <div className="stack" style={{ padding: 32 }}>
      <Placeholder
        title={`Questionnaire: ${questionnaire.templateName}`}
        path={`/staff/questionnaires/${id}`}
        description="View the questions and details of this template."
      />
      <QuestionnaireView questionnaire={questionnaire} />
    </div>
  );
}
