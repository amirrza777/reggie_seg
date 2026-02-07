"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllQuestionnaires } from "../api/client";
import { Questionnaire } from "../types";
import { EditQuestionnaireButton, DeleteQuestionnaireButton } from "./SharedQuestionnaireButtons";

export function QuestionnaireList() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const router = useRouter();

  useEffect(() => {
    getAllQuestionnaires().then(setQuestionnaires);
  }, []);

  if (questionnaires.length === 0) {
    return <p style={{ opacity: 0.7 }}>No questionnaires yet.</p>;
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      {questionnaires.map((q) => (
        <div
          key={q.id}
          style={{
            padding: 16,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <strong>{q.templateName}</strong>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Created {new Date(q.createdAt).toLocaleDateString()}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>

            <button
              className="btn"
              onClick={() => router.push(`/staff/questionnaires/${q.id}`)}
            >
              Preview
            </button>

            <EditQuestionnaireButton questionnaireId={q.id} />

            <DeleteQuestionnaireButton questionnaireId={q.id} />
            
          </div>
        </div>
      ))}
    </div>
  );
}
