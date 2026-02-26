"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMyQuestionnaires,
  getPublicQuestionnairesFromOthers,
} from "../api/client";
import { Questionnaire } from "../types";
import { EditQuestionnaireButton, DeleteQuestionnaireButton } from "./SharedQuestionnaireButtons";

export function QuestionnaireList() {
  const [myQuestionnaires, setMyQuestionnaires] = useState<Questionnaire[]>([]);
  const [publicQuestionnaires, setPublicQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    Promise.all([getMyQuestionnaires(), getPublicQuestionnairesFromOthers()])
      .then(([mine, publicOthers]) => {
        if (!active) return;
        setMyQuestionnaires(mine);
        setPublicQuestionnaires(publicOthers);
      })
      .catch((err: unknown) => {
        if (!active) return;
        console.error(err);
        setError("Failed to load questionnaires.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p style={{ opacity: 0.7 }}>Loading questionnaires...</p>;
  if (error) return <p style={{ opacity: 0.7 }}>{error}</p>;
  if (myQuestionnaires.length === 0 && publicQuestionnaires.length === 0) {
    return <p style={{ opacity: 0.7 }}>No questionnaires yet.</p>;
  }

  const sectionTitleStyle: React.CSSProperties = {
    marginBottom: 8,
    fontSize: "var(--fs-h4)",
    lineHeight: "var(--lh-heading)",
  };

  const cardStyle: React.CSSProperties = {
    padding: 16,
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const renderCard = (q: Questionnaire, allowManage: boolean) => (
    <div key={q.id} style={cardStyle}>
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
        {allowManage && <EditQuestionnaireButton questionnaireId={q.id} />}
        {allowManage && (
          <DeleteQuestionnaireButton
            questionnaireId={q.id}
            onDeleted={(deletedId) => {
              const idNum = typeof deletedId === "string" ? Number(deletedId) : deletedId;
              setMyQuestionnaires((items) => items.filter((item) => item.id !== idNum));
            }}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="stack" style={{ gap: 20 }}>
      <section className="stack" style={{ gap: 12 }}>
        <h2 style={sectionTitleStyle}>My questionnaires</h2>
        {myQuestionnaires.length === 0
          ? <p style={{ opacity: 0.7 }}>You have not created any questionnaires yet.</p>
          : myQuestionnaires.map((q) => renderCard(q, true))}
      </section>

      <section className="stack" style={{ gap: 12 }}>
        <h2 style={sectionTitleStyle}>Public questionnaires</h2>
        {publicQuestionnaires.length === 0
          ? <p style={{ opacity: 0.7 }}>No public questionnaires from other users yet.</p>
          : publicQuestionnaires.map((q) => renderCard(q, false))}
      </section>
    </div>
  );
}
