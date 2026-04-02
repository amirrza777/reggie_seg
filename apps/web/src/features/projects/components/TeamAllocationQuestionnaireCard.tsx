"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { submitTeamAllocationQuestionnaireResponse } from "@/features/projects/api/client";

type AnswerValue = string | number | boolean;

type TeamAllocationQuestionnaire = {
  id: number;
  questions: Array<{
    id: number;
    label: string;
    type: string;
    configs?: unknown;
  }>;
};

type TeamAllocationQuestionnaireCardProps = {
  projectId: number;
  currentUserId: number;
  questionnaire: TeamAllocationQuestionnaire;
  initialSubmitted?: boolean;
};

function normalizeQuestionType(type: unknown): "text" | "multiple-choice" | "rating" | "slider" {
  const normalized = String(type ?? "").trim().toLowerCase();
  if (normalized === "multiple-choice" || normalized === "multiple_choice") return "multiple-choice";
  if (normalized === "rating") return "rating";
  if (normalized === "slider") return "slider";
  return "text";
}

export function TeamAllocationQuestionnaireCard({
  projectId,
  currentUserId,
  questionnaire,
  initialSubmitted = false,
}: TeamAllocationQuestionnaireCardProps) {
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(initialSubmitted);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const storageKey = `team-allocation-questionnaire-submitted:${currentUserId}:${projectId}:${questionnaire.id}`;

  const hasUnsupportedQuestions = useMemo(
    () => questionnaire.questions.some((question) => normalizeQuestionType(question.type) === "text"),
    [questionnaire.questions],
  );

  useEffect(() => {
    try {
      const sessionSubmitted = window.sessionStorage.getItem(storageKey) === "1";
      setIsSubmitted(initialSubmitted || sessionSubmitted);
    } catch {
      setIsSubmitted(initialSubmitted);
    }
  }, [initialSubmitted, storageKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (hasUnsupportedQuestions) {
      setSubmitError(
        "This questionnaire contains unsupported text questions. Please contact staff to update the template.",
      );
      return;
    }

    const firstUnanswered = questionnaire.questions.find((question) => answers[question.id] === undefined);
    if (firstUnanswered) {
      setSubmitError("Please answer every question before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitTeamAllocationQuestionnaireResponse(projectId, answers);
      setIsSubmitted(true);
      try {
        window.sessionStorage.setItem(storageKey, "1");
      } catch {
        // ignore storage failures
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit response.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <Card title="Team allocation questionnaire">
        <p className="ui-note ui-note--success" style={{ margin: 0 }}>
          Thank you. Your questionnaire response has been submitted successfully.
        </p>
        <p className="muted" style={{ marginTop: 10 }}>
          Staff will review responses and assign you to a team.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Team allocation questionnaire">
      <p className="muted">
        Complete this questionnaire so staff can place you into a team.
      </p>
      <form
        onSubmit={handleSubmit}
        className="team-allocation-questionnaire__form"
        style={{ marginTop: 16, display: "grid", rowGap: 24 }}
      >
        {questionnaire.questions.map((question, index) => {
          const questionType = normalizeQuestionType(question.type);
          const choiceOptions = Array.isArray((question.configs as { options?: string[] } | undefined)?.options)
            ? ((question.configs as { options?: string[] }).options ?? [])
            : [];
          const ratingMin = (question.configs as { min?: number } | undefined)?.min ?? 1;
          const ratingMax = (question.configs as { max?: number } | undefined)?.max ?? 5;
          const ratingValues = Array.from(
            { length: Math.max(0, ratingMax - ratingMin + 1) },
            (_unused, idx) => ratingMin + idx,
          );
          const sliderMin = (question.configs as { min?: number } | undefined)?.min ?? 0;
          const sliderMax = (question.configs as { max?: number } | undefined)?.max ?? 100;
          const sliderStep = (question.configs as { step?: number } | undefined)?.step ?? 1;
          const sliderValue = Number(answers[question.id] ?? sliderMin);
          return (
            <div
              key={question.id}
              className="team-allocation-questionnaire__question"
              style={{ display: "grid", gap: 10 }}
            >
              <label className="team-allocation-questionnaire__question-title" style={{ fontWeight: 600 }}>
                {index + 1}. {question.label}
              </label>
              {questionType === "multiple-choice" ? (
                <div className="team-allocation-questionnaire__choice-list" style={{ display: "grid", gap: 8 }}>
                  {choiceOptions.map((option) => (
                    <label
                      key={option}
                      className="team-allocation-questionnaire__choice-option"
                      style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
                    >
                      <input
                        type="radio"
                        className="team-allocation-questionnaire__radio-input"
                        style={{
                          width: 16,
                          minWidth: 16,
                          height: 16,
                          margin: "2px 0 0",
                          padding: 0,
                          border: 0,
                          borderRadius: "50%",
                          background: "transparent",
                          accentColor: "var(--accent)",
                          flexShrink: 0,
                        }}
                        name={`question-${question.id}`}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                      />
                      <span className="team-allocation-questionnaire__choice-text" style={{ lineHeight: 1.35 }}>
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
              {questionType === "rating" ? (
                <div
                  className="team-allocation-questionnaire__rating-grid"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 18,
                    flexWrap: "nowrap",
                    overflowX: "auto",
                    paddingBottom: 4,
                    maxWidth: "100%",
                  }}
                >
                  {ratingValues.map((value) => (
                    <label
                      key={value}
                      className="team-allocation-questionnaire__rating-option"
                      style={{
                        display: "inline-flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        minWidth: 24,
                        flexShrink: 0,
                      }}
                    >
                      <input
                        type="radio"
                        className="team-allocation-questionnaire__radio-input"
                        style={{
                          width: 16,
                          minWidth: 16,
                          height: 16,
                          margin: 0,
                          padding: 0,
                          border: 0,
                          borderRadius: "50%",
                          background: "transparent",
                          accentColor: "var(--accent)",
                          flexShrink: 0,
                        }}
                        name={`question-${question.id}`}
                        value={value}
                        checked={answers[question.id] === value}
                        onChange={() => setAnswers((current) => ({ ...current, [question.id]: value }))}
                      />
                      <span
                        className="team-allocation-questionnaire__rating-value"
                        style={{ fontSize: 12, lineHeight: 1, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}
                      >
                        {value}
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
              {questionType === "slider" ? (
                <div className="team-allocation-questionnaire__slider-field" style={{ display: "grid", gap: 8 }}>
                  <input
                    type="range"
                    className="team-allocation-questionnaire__slider-input"
                    style={{
                      width: "100%",
                      minHeight: 20,
                      margin: 0,
                      padding: 0,
                      border: 0,
                      borderRadius: 0,
                      background: "transparent",
                      accentColor: "var(--status-success-text)",
                    }}
                    min={sliderMin}
                    max={sliderMax}
                    step={sliderStep}
                    value={sliderValue}
                    onChange={(event) =>
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: Number(event.target.value),
                      }))
                    }
                  />
                  <div
                    className="team-allocation-questionnaire__slider-meta"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
                  >
                    <span className="muted" style={{ fontSize: 12, minWidth: 22 }}>
                      {sliderMin}
                    </span>
                    <span className="team-allocation-questionnaire__slider-selected" style={{ color: "var(--text)", fontWeight: 600 }}>
                      Selected: {sliderValue}
                    </span>
                    <span className="muted" style={{ fontSize: 12, minWidth: 22, textAlign: "right" }}>
                      {sliderMax}
                    </span>
                  </div>
                </div>
              ) : null}
              {questionType === "text" ? (
                <p className="ui-note ui-note--warn">
                  Text questions are not supported for customised allocation.
                </p>
              ) : null}
            </div>
          );
        })}

        <div className="team-allocation-questionnaire__actions">
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit questionnaire"}
          </Button>
        </div>
        {submitError ? <p className="ui-note ui-note--warn">{submitError}</p> : null}
      </form>
    </Card>
  );
}