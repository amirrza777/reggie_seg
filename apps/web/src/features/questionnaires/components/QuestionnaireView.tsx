"use client";

import type {
  Questionnaire,
  Question,
  RatingConfigs,
  MultipleChoiceConfigs,
  SliderConfigs,
} from "../types";

type Props = {
  questionnaire: Questionnaire;
};

export function QuestionnaireView({ questionnaire }: Props) {
  if (questionnaire.questions.length === 0) {
    return <p>No questions in this questionnaire.</p>;
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {questionnaire.questions.map((q: Question, idx) => (
        <div key={q.id} style={{ marginBottom: 24 }}>
          <strong>{idx + 1}.</strong>
          <p style={{ marginTop: 8 }}>{q.text}</p>

          {q.type === "text" && (
            <input
              disabled
              placeholder="Student response"
              style={{ width: "100%", marginTop: 8, opacity: 0.7 }}
            />
          )}

          {q.type === "multiple-choice" && (
            <div style={{ marginTop: 8 }}>
              {(q.configs as MultipleChoiceConfigs)?.options.map((opt) => (
                <label key={opt} style={{ display: "block", marginTop: 6 }}>
                  <input type="radio" disabled /> {opt}
                </label>
              ))}
            </div>
          )}

          {q.type === "rating" && (() => {
            const { min, max } = q.configs as RatingConfigs;
            return (
              <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
                  <label key={n} style={{ fontSize: 12 }}>
                    <input type="radio" disabled /> {n}
                  </label>
                ))}
              </div>
            );
          })()}

          {q.type === "slider" && (() => {
            const { min, max, step, left, right, helperText } =
              q.configs as SliderConfigs;

            return (
              <>
                {helperText && (
                  <p style={{ fontSize: 12, opacity: 0.7 }}>{helperText}</p>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    opacity: 0.7,
                  }}
                >
                  <span>{left}</span>
                  <span>{right}</span>
                </div>

                <input
                  type="range"
                  disabled
                  min={min}
                  max={max}
                  step={step}
                  style={{ width: "100%", marginTop: 6 }}
                />
              </>
            );
          })()}
        </div>
      ))}
    </div>
  );
}
