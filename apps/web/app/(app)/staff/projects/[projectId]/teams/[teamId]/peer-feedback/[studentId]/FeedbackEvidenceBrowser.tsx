"use client";

import { useMemo, useState } from "react";
import type { AgreementsMap, Answer } from "@/features/peerFeedback/types";

type FeedbackEvidenceRow = {
  id: string;
  counterpartName: string;
  submittedAt: string;
  answers: Answer[];
  reviewText: string | null;
  agreementsJson: AgreementsMap | null;
};

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatAnswer(answer: Answer["answer"]) {
  if (answer == null || String(answer).trim().length === 0) return "No response";
  return String(answer);
}

function getQuestionLabel(answer: Answer, index: number) {
  if (answer.question && answer.question.trim().length > 0) return answer.question.trim();
  if (answer.id && answer.id.trim().length > 0) return answer.id.trim();
  return `Question ${index + 1}`;
}

function getAnswerRating(agreementsJson: AgreementsMap | null, answer: Answer, answerIndex: number) {
  if (!agreementsJson) return null;

  if (answer.id && agreementsJson[answer.id]) {
    return agreementsJson[answer.id];
  }

  const entries = Object.entries(agreementsJson);
  if (entries.length === 0) return null;

  const questionToken = normalizeToken(answer.question ?? "");
  if (questionToken.length > 0) {
    const byQuestionMatch = entries.find(([key]) => {
      const keyToken = normalizeToken(key);
      return keyToken.includes(questionToken) || questionToken.includes(keyToken);
    });
    if (byQuestionMatch) return byQuestionMatch[1];
  }

  const answerIdToken = normalizeToken(answer.id ?? "");
  if (answerIdToken.length > 0) {
    const byIdMatch = entries.find(([key]) => normalizeToken(key) === answerIdToken);
    if (byIdMatch) return byIdMatch[1];
  }

  const byIndex = entries[answerIndex];
  return byIndex ? byIndex[1] : null;
}

export function FeedbackEvidenceBrowser({
  title,
  subtitle,
  items,
  emptyMessage,
  headerAside,
}: {
  title: string;
  subtitle: string;
  items: FeedbackEvidenceRow[];
  emptyMessage: string;
  headerAside?: {
    label: string;
    value: string;
  };
}) {
  const [selectedId, setSelectedId] = useState<string>(items[0]?.id ?? "");
  const compactSelection = items.length <= 3;

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );

  return (
    <section className="staff-projects__team-card">
      <div className="staff-projects__feedback-evidence-header">
        <div className="stack" style={{ gap: 4 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <p className="muted" style={{ margin: 0 }}>
            {subtitle}
          </p>
        </div>
        {headerAside ? (
          <div className="staff-projects__badge staff-projects__feedback-evidence-badge">
            <span className="muted" style={{ fontSize: "0.8rem" }}>
              {headerAside.label}
            </span>
            <strong style={{ fontSize: "1rem", lineHeight: 1.2 }}>{headerAside.value}</strong>
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          {emptyMessage}
        </p>
      ) : (
        <div className="staff-projects__feedback-evidence-layout">
          <aside
            className={`staff-projects__team-card staff-projects__feedback-evidence-sidebar${
              compactSelection ? " staff-projects__feedback-evidence-sidebar--compact" : ""
            }`}
            style={{ margin: 0, padding: 8 }}
          >
            <div className="staff-projects__feedback-evidence-list">
              {items.map((item) => {
                const isActive = item.id === selectedItem?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className="staff-projects__team-card staff-projects__feedback-evidence-item"
                    style={{
                      margin: 0,
                      textAlign: "left",
                      padding: "8px 10px",
                      cursor: "pointer",
                      borderColor: isActive ? "var(--accent-border)" : "var(--border)",
                      background: isActive
                        ? "color-mix(in srgb, var(--accent) 10%, var(--surface))"
                        : "var(--surface)",
                      color: "var(--ink)",
                    }}
                    aria-pressed={isActive}
                  >
                    <strong style={{ display: "block", color: "var(--ink)" }}>{item.counterpartName}</strong>
                    <span className="muted" style={{ fontSize: "0.82rem" }}>
                      Submitted: {new Date(item.submittedAt).toLocaleDateString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {selectedItem ? (
            <article className="staff-projects__team-card staff-projects__feedback-evidence-content" style={{ margin: 0 }}>
              <h4 style={{ margin: 0 }}>{selectedItem.counterpartName}</h4>

              {selectedItem.answers.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  No answers stored for this submission.
                </p>
              ) : (
                <div className="stack" style={{ gap: 8 }}>
                  {selectedItem.answers.map((answer, answerIndex) => {
                    const questionLabel = getQuestionLabel(answer, answerIndex);
                    const rating = getAnswerRating(selectedItem.agreementsJson, answer, answerIndex);
                    const ratingText = rating
                      ? `${rating.selected ?? "Reasonable"} (${rating.score}/5)`
                      : "No rating";

                    return (
                      <details
                        key={`${selectedItem.id}-${answer.id ?? answerIndex}`}
                        className="staff-projects__team-card"
                        style={{ margin: 0 }}
                      >
                        <summary
                          style={{
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            alignItems: "baseline",
                          }}
                        >
                          <strong>{questionLabel}</strong>
                          <span className="muted" style={{ whiteSpace: "nowrap" }}>
                            {ratingText}
                          </span>
                        </summary>
                        <p className="muted" style={{ margin: "8px 0 0" }}>
                          {formatAnswer(answer.answer)}
                        </p>
                      </details>
                    );
                  })}
                </div>
              )}

              <div className="staff-projects__team-card" style={{ margin: 0, padding: "10px 12px" }}>
                <p style={{ margin: 0, fontWeight: 600 }}>Feedback summary</p>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  {selectedItem.reviewText && selectedItem.reviewText.trim().length > 0
                    ? selectedItem.reviewText
                    : "No feedback summary submitted."}
                </p>
              </div>
            </article>
          ) : null}
        </div>
      )}
    </section>
  );
}
