import Link from "next/link";
import { QuestionnaireList } from "@/features/questionnaires/components/QuestionnaireList";

export default function QuestionnairesPage() {
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--fs-h2)",
              lineHeight: "var(--lh-heading)",
              marginBottom: 6,
            }}
          >
            Questionnaires
          </h1>

          <p
            style={{
              color: "var(--muted)",
              fontSize: "var(--fs-body)",
            }}
          >
            Create, view, and manage questionnaire templates.
          </p>
        </div>

        <Link href="/staff/questionnaires/new">
          <button
            style={{
              padding: "14px 18px",
              background: "var(--btn-primary-bg)",
              color: "var(--btn-primary-text)",
              border: "1px solid var(--btn-primary-border)",
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
            }}
            className="btn"
          >
            + Create questionnaire
          </button>
        </Link>
      </div>
      <QuestionnaireList />
    </div>
  );
}
