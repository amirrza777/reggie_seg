import Link from "next/link";
import { QuestionnaireList } from "@/features/questionnaires/components/questionnaireList";
import "@/features/staff/projects/styles/staff-projects.css";

export default function QuestionnairesPage() {
  return (
    <div className="staff-projects staff-projects--panel-inset">
      <section className="staff-projects__hero">
        <h1 className="staff-projects__title">Questionnaires</h1>
        <p className="staff-projects__desc">Create, view, and manage questionnaire templates.</p>
        <div className="staff-projects__hero-actions">
          <Link href="/staff/questionnaires/new" className="staff-projects__quick-link">
            + Create questionnaire
          </Link>
        </div>
      </section>
      <QuestionnaireList />
    </div>
  );
}
