import { QuestionnaireList } from "@/features/questionnaires/components/QuestionnaireList";
import { Placeholder } from "@/shared/ui/Placeholder";
import Link from "next/link";

export default function QuestionnairesPage() {
  return (
    <div className="stack">
      <Placeholder
        title="Questionnaires"
        description="Create, view, and manage questionnaire templates."
        action={
          <Link href="/staff/questionnaires/new" className="btn-primary">
            Create questionnaire
          </Link>
        }
      />

      <QuestionnaireList />
    </div>
  );
}
