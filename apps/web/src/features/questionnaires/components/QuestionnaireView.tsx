import React from "react";
import { Questionnaire, Question } from "../types";

type Props = {
  questionnaire: Questionnaire;
};

export function QuestionnaireView({ questionnaire }: Props) {
  return (
    <div>
      <h2>Questions</h2>
      {questionnaire.questions.length === 0 && <p>No questions in this template.</p>}
      <ul>
        {questionnaire.questions.map((q: Question, idx) => (
          <li key={q.id} style={{ marginBottom: 16 }}>
            <strong>{idx + 1}. {q.type}</strong>
            <p>{q.text}</p>

            {q.type === "multiple-choice" && q.configs?.options && (
              <ul>
                {q.configs.options.map((opt, i) => (
                  <li key={i}>{opt}</li>
                ))}
              </ul>
            )}

            {q.type === "rating" && (
              <p>Scale: {q.configs?.min} to {q.configs?.max}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
