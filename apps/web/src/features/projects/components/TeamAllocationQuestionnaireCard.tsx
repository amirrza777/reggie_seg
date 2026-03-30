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
      <form onSubmit={handleSubmit} style={{ marginTop: 12, display: "grid", gap: 16 }}>
        {questionnaire.questions.map((question, index) => {
          const questionType = normalizeQuestionType(question.type);
          return (
            <div key={question.id} style={{ display: "grid", gap: 8 }}>
              <label style={{ fontWeight: 600 }}>
                {index + 1}. {question.label}
              </label>
              {questionType === "multiple-choice" ? (
                <div style={{ display: "grid", gap: 6 }}>
                  {Array.isArray((question.configs as { options?: string[] } | undefined)?.options)
                    ? ((question.configs as { options?: string[] }).options ?? []).map((option) => (
                        <label key={option} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={option}
                            checked={answers[question.id] === option}
                            onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                          />
                          <span>{option}</span>
                        </label>
                      ))
                    : null}
                </div>
              ) : null}
              {questionType === "rating" ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {Array.from(
                    {
                      length:
                        ((question.configs as { max?: number } | undefined)?.max ?? 5) -
                        ((question.configs as { min?: number } | undefined)?.min ?? 1) +
                        1,
                    },
                    (_unused, idx) => ((question.configs as { min?: number } | undefined)?.min ?? 1) + idx,
                  ).map((value) => (
                    <label key={value} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={value}
                        checked={answers[question.id] === value}
                        onChange={() => setAnswers((current) => ({ ...current, [question.id]: value }))}
                      />
                      <span>{value}</span>
                    </label>
                  ))}
                </div>
              ) : null}
              {questionType === "slider" ? (
                <div style={{ display: "grid", gap: 6 }}>
                  <input
                    type="range"
                    min={(question.configs as { min?: number } | undefined)?.min ?? 0}
                    max={(question.configs as { max?: number } | undefined)?.max ?? 100}
                    step={(question.configs as { step?: number } | undefined)?.step ?? 1}
                    value={Number(
                      answers[question.id] ??
                        (question.configs as { min?: number } | undefined)?.min ??
                        0,
                    )}
                    onChange={(event) =>
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: Number(event.target.value),
                      }))
                    }
                  />
                  <span className="muted" style={{ fontSize: 12 }}>
                    Selected:{" "}
                    {String(
                      answers[question.id] ??
                        (question.configs as { min?: number } | undefined)?.min ??
                        0,
                    )}
                  </span>
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

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit questionnaire"}
          </Button>
        </div>
        {submitError ? <p className="ui-note ui-note--warn">{submitError}</p> : null}
      </form>
    </Card>
  );
}
