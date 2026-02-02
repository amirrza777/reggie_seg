import { QuestionnaireList } from "@/features/questionnaires/components/QuestionnaireList";
import { Placeholder } from "@/shared/ui/Placeholder";

export default async function QuestionnairesPage() {
  return (
    <div className="stack">
      <Placeholder
        title="Questionnaires"
        path="/staff/questionnaires"
        description="Create, view, and manage questionnaire templates."
      />
      <QuestionnaireList />
    </div>
  );
}
