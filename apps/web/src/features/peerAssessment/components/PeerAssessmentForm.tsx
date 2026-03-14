"use client";

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import type { Question } from "../types";
import { createPeerAssessment, updatePeerAssessment } from "../api/client";

type AnswerValue = string | number;

const toAnswersArray = (answers: Record<string, AnswerValue>) =>
  Object.entries(answers).map(([question, answer]) => ({
    question,
    answer,
  }));

const questionContainerStyle: CSSProperties = { display: "grid", gap: 6 };
const answerInputStyle: CSSProperties = {
  padding: 8,
  border: "1px solid var(--border)",
  borderRadius: 4,
  backgroundColor: "var(--surface)",
  color: "var(--ink)",
  fontFamily: "inherit",
  fontSize: "inherit",
};

function isNumericQuestion(question: Question) {
  return question.type === "rating" || question.type === "slider";
}

function getRatingBounds(question: Question) {
  const min = typeof question.configs?.min === "number" ? question.configs.min : 1;
  const configuredMax = typeof question.configs?.max === "number" ? question.configs.max : min + 4;
  const max = configuredMax >= min ? configuredMax : min;
  return { min, max };
}

function getSliderConfig(question: Question) {
  const min = typeof question.configs?.min === "number" ? question.configs.min : 0;
  const configuredMax = typeof question.configs?.max === "number" ? question.configs.max : min + 100;
  const max = configuredMax >= min ? configuredMax : min;
  const step = typeof question.configs?.step === "number" && question.configs.step > 0 ? question.configs.step : 1;
  return {
    min,
    max,
    step,
    left: question.configs?.left ?? "",
    right: question.configs?.right ?? "",
    helperText: question.configs?.helperText ?? "",
  };
}

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateLabel(value: Date | null): string {
  return value ? value.toLocaleString() : "Not set";
}

type PeerAssessmentFormProps = {
  teammateName: string;
  questions: Question[];
  projectId: number;
  teamId: number;
  reviewerId: number;
  revieweeId: number;
  templateId: number;
  initialAnswers?: Record<string, string | number | boolean | null>;
  assessmentId?: number;
  assessmentOpenAt?: string | null;
  assessmentDueAt?: string | null;
};

export function PeerAssessmentForm({
  teammateName,
  questions,
  projectId,
  teamId,
  reviewerId,
  revieweeId,
  templateId,
  initialAnswers,
  assessmentId,
  assessmentOpenAt = null,
  assessmentDueAt = null,
}: PeerAssessmentFormProps) {
  const router = useRouter();
  const peerAssessmentsPath = `/projects/${projectId}/peer-assessments`;
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const isEditMode = !!assessmentId;
  const openAt = toDate(assessmentOpenAt);
  const dueAt = toDate(assessmentDueAt);
  const now = new Date();

  const isBeforeOpen = Boolean(openAt && now < openAt);
  const isAfterDue = Boolean(dueAt && now > dueAt);
  const canSubmit = !isBeforeOpen && !isAfterDue;

  const deadlineStatusMessage = isBeforeOpen
    ? `Peer assessment is locked until ${formatDateLabel(openAt)}.`
    : isAfterDue
      ? `Peer assessment deadline passed on ${formatDateLabel(dueAt)}.`
      : dueAt
        ? `Peer assessment is open. Deadline: ${formatDateLabel(dueAt)}.`
        : null;

  const normalizeAnswers = (
    raw: Record<string, string | number | boolean | null> | undefined
  ): Record<string, AnswerValue> => {
    if (!raw || typeof raw !== "object") return {};
    const normalized: Record<string, AnswerValue> = {};
    Object.entries(raw).forEach(([k, v]) => {
      const question = questions.find((item) => String(item.id) === k);
      if (question && isNumericQuestion(question)) {
        if (typeof v === "number" && Number.isFinite(v)) {
          normalized[k] = v;
          return;
        }
        if (typeof v === "string" && v.trim().length > 0) {
          const parsed = Number(v);
          if (Number.isFinite(parsed)) {
            normalized[k] = parsed;
            return;
          }
        }
      }
      normalized[k] = String(v ?? "");
    });
    return normalized;
  };


  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnswers(normalizeAnswers(initialAnswers));
  }, [initialAnswers, questions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      setStatus("error");
      setMessage(deadlineStatusMessage ?? "Peer assessment is outside the allowed deadline window.");
      return;
    }
    setStatus("loading");
    setMessage(null);

    try {
      if (isEditMode && assessmentId) {
        await updatePeerAssessment(assessmentId, answers);
      } else {
        await createPeerAssessment({
          projectId,
          teamId,
          reviewerUserId: reviewerId,
          revieweeUserId: revieweeId,
          templateId,
          answersJson: toAnswersArray(answers),
        });
      }
      setStatus("success");
      setMessage(
        isEditMode ? "Assessment updated successfully!" : "Assessment saved successfully!"
      );
      router.push(peerAssessmentsPath);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Failed to save assessment"
      );
    }
  };

  const handleDiscard = () => {
    setAnswers(normalizeAnswers(initialAnswers));
    setMessage(null);
  };

  const handleBack = () => {
    router.push(peerAssessmentsPath);
    router.refresh();
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <h3>
         You're reviewing {teammateName}
      </h3>
      {deadlineStatusMessage ? (
        <p className={canSubmit ? "muted" : "error"}>{deadlineStatusMessage}</p>
      ) : null}
      {questions.map((question) => {
        const key = String(question.id);
        const answer = answers[key];

        if (question.type === "multiple-choice") {
          const options = question.configs?.options ?? [];
          return (
            <div key={question.id} style={questionContainerStyle}>
              <label style={{ color: "var(--ink)", fontWeight: 500 }}>{question.text}</label>
              {options.map((option) => (
                <label key={option} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={answer === option}
                    onChange={() =>
                      setAnswers((prev) => ({ ...prev, [key]: option }))
                    }
                  />
                  <span>{option}</span>
                </label>
              ))}
              {options.length === 0 ? (
                <p className="muted">No options configured for this question.</p>
              ) : null}
            </div>
          );
        }

        if (question.type === "rating") {
          const { min, max } = getRatingBounds(question);
          return (
            <div key={question.id} style={questionContainerStyle}>
              <label style={{ color: "var(--ink)", fontWeight: 500 }}>{question.text}</label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((value) => (
                  <label key={value} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={value}
                      checked={answer === value}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [key]: value }))
                      }
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        }

        if (question.type === "slider") {
          const config = getSliderConfig(question);
          const sliderValue =
            typeof answer === "number" && Number.isFinite(answer)
              ? answer
              : config.min;

          return (
            <div key={question.id} style={questionContainerStyle}>
              <label style={{ color: "var(--ink)", fontWeight: 500 }}>{question.text}</label>
              {config.helperText ? (
                <p className="muted" style={{ margin: 0 }}>{config.helperText}</p>
              ) : null}
              {(config.left || config.right) ? (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span className="muted">{config.left}</span>
                  <span className="muted">{config.right}</span>
                </div>
              ) : null}
              <input
                type="range"
                min={config.min}
                max={config.max}
                step={config.step}
                value={sliderValue}
                onChange={(event) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [key]: Number(event.target.value),
                  }))
                }
              />
              <p className="muted" style={{ margin: 0 }}>Selected: {sliderValue}</p>
            </div>
          );
        }

        return (
          <div key={question.id} style={questionContainerStyle}>
            <label style={{ color: "var(--ink)", fontWeight: 500 }}>{question.text}</label>
            <input
              type="text"
              value={typeof answer === "string" ? answer : String(answer ?? "")}
              onChange={(event) =>
                setAnswers((prev) => ({ ...prev, [key]: event.target.value }))
              }
              style={answerInputStyle}
            />
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button type="button" onClick={handleDiscard}>
          {isEditMode ? "Reset changes" : "Discard changes"}
        </Button>
        <Button type="submit" disabled={status === "loading" || !canSubmit}>
          {status === "loading"
            ? "Saving..."
            : isEditMode
              ? "Update Assessment"
              : "Save Assessment"}
        </Button>
        <Button type="button" onClick={handleBack} style={{ marginLeft: 'auto' }}>
          Back
        </Button>
      </div>
      {message ? (
        <p className={status === "error" ? "error" : "muted"}>{message}</p>
      ) : null}
    </form>
  );
}
