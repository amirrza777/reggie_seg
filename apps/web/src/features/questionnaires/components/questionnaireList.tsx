"use client";

import { useEffect, useState } from "react";
import { getAllQuestionnaires } from "../api/client";
import { Questionnaire } from "../types";

export function QuestionnaireList() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);

  useEffect(() => {
    getAllQuestionnaires().then(setQuestionnaires);
  }, []);

  if (questionnaires.length === 0) return <p>No questionnaires yet.</p>;

  return (
    <ul>
      {questionnaires.map((q) => (
        <li key={q.id}>
          <strong>{q.templateName}</strong> — {new Date(q.createdAt).toLocaleDateString()}
        </li>
      ))}
    </ul>
  );
}
