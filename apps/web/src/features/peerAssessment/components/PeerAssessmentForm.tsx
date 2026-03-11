"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import type { Question } from "../types";
import { createPeerAssessment, updatePeerAssessment } from "../api/client";

type AnswerValue = string | number;

const toAnswersArray = (
  answers: Record<string, AnswerValue>,
  orderedQuestions: Question[]
) =>
  orderedQuestions
    .filter((question) => Object.prototype.hasOwnProperty.call(answers, String(question.id)))
    .map((question) => ({
      question: String(question.id),
      answer: answers[String(question.id)],
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
const radioInputStyle: CSSProperties = {
  width: "auto",
  minWidth: 0,
  padding: 0,
  margin: 0,
  border: "none",
  background: "transparent",
  flex: "0 0 auto",
};

function isNumericQuestion(question: Question) {
  return question.type === "rating" || question.type === "slider";
}

function isQuestionAnswered(question: Question, answer: AnswerValue | undefined) {
  if (question.type === "rating" || question.type === "slider") {
    return typeof answer === "number" && Number.isFinite(answer);
  }

  if (question.type === "multiple-choice") {
    if (typeof answer !== "string" || answer.trim().length === 0) return false;
    const options = Array.isArray(question.configs?.options) ? question.configs.options : [];
    if (options.length === 0) return false;
    return options.includes(answer);
  }

  return typeof answer === "string" && answer.trim().length > 0;
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
    left: typeof question.configs?.left === "string" ? question.configs.left : undefined,
    right: typeof question.configs?.right === "string" ? question.configs.right : undefined,
    helperText:
      typeof question.configs?.helperText === "string" ? question.configs.helperText : undefined,
  };
}

function getTextConfig(question: Question) {
  const minLength =
    typeof question.configs?.minLength === "number" && question.configs.minLength >= 0
      ? question.configs.minLength
      : undefined;
  const maxLength =
    typeof question.configs?.maxLength === "number" && question.configs.maxLength >= 0
      ? question.configs.maxLength
      : undefined;

  return {
    helperText:
      typeof question.configs?.helperText === "string" ? question.configs.helperText : undefined,
    placeholder:
      typeof question.configs?.placeholder === "string" ? question.configs.placeholder : undefined,
    minLength,
    maxLength,
  };
}

type PeerAssessmentFormProps = {
  teammateName: string;
  questions: Question[];
  projectId: number;
  teamId: number;
  reviewerId: number;
  revieweeId: number;
  templateId: number;
  assessmentDeadline?: string | null;
  initialAnswers?: Record<string, string | number | boolean | null>;
  assessmentId?: number;
};

function formatRemainingDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const two = (value: number) => String(value).padStart(2, "0");
  return `${two(days)}d : ${two(hours)}h : ${two(minutes)}m : ${two(seconds)}s`;
}

export function PeerAssessmentForm({
  teammateName,
  questions,
  projectId,
  teamId,
  reviewerId,
  revieweeId,
  templateId,
  assessmentDeadline,
  initialAnswers,
  assessmentId,
}: PeerAssessmentFormProps) {
  const router = useRouter();
  const peerAssessmentsPath = `/projects/${projectId}/peer-assessments`;
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const isEditMode = !!assessmentId;
  const orderedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.order - b.order),
    [questions]
  );
  const unansweredQuestions = useMemo(
    () => orderedQuestions.filter((question) => !isQuestionAnswered(question, answers[String(question.id)])),
    [orderedQuestions, answers]
  );
  const allQuestionsAnswered = unansweredQuestions.length === 0;
  const deadlineTimestamp = useMemo(() => {
    if (!assessmentDeadline) return null;
    const timestamp = new Date(assessmentDeadline).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }, [assessmentDeadline]);
  const [currentTimestamp, setCurrentTimestamp] = useState<number | null>(null);
  const remainingSeconds = useMemo(() => {
    if (deadlineTimestamp == null || currentTimestamp == null) return null;
    return Math.max(0, Math.ceil((deadlineTimestamp - currentTimestamp) / 1000));
  }, [deadlineTimestamp, currentTimestamp]);
  const hasPassedDeadline = remainingSeconds != null && remainingSeconds <= 0;

  const normalizeAnswers = useCallback((
    raw: Record<string, string | number | boolean | null> | undefined
  ): Record<string, AnswerValue> => {
    if (!raw || typeof raw !== "object") return {};
    const normalized: Record<string, AnswerValue> = {};
    Object.entries(raw).forEach(([k, v]) => {
      const question = orderedQuestions.find((item) => String(item.id) === k);
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
      normalized[k] = v == null ? "" : String(v);
    });
    return normalized;
  }, [orderedQuestions]);

  useEffect(() => {
    setAnswers(normalizeAnswers(initialAnswers));
  }, [initialAnswers, normalizeAnswers]);

  useEffect(() => {
    if (deadlineTimestamp == null) return;
    const tick = () => {
      setCurrentTimestamp(Date.now());
    };
    tick();
    const interval = window.setInterval(() => {
      tick();
    }, 1000);

    return () => window.clearInterval(interval);
  }, [deadlineTimestamp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allQuestionsAnswered) {
      setStatus("error");
      setMessage("Please answer every question before submitting.");
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
          answersJson: toAnswersArray(answers, orderedQuestions),
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
      {remainingSeconds != null ? (
        <p className={hasPassedDeadline ? "error" : "muted"}>
          {hasPassedDeadline
            ? "Assessment deadline reached."
            : `Time left until deadline: ${formatRemainingDuration(remainingSeconds)}`}
        </p>
      ) : null}
      {orderedQuestions.map((question) => {
        const key = String(question.id);
        const answer = answers[key];
        const required = question.configs?.required === true;
        const helperText = question.configs?.helperText;

        if (question.type === "multiple-choice") {
          const options = Array.isArray(question.configs?.options) ? question.configs.options : [];
          return (
            <div key={question.id} style={questionContainerStyle}>
              <label style={{ color: "var(--ink)", fontWeight: 500 }}>{question.text}</label>
              {helperText ? (
                <p className="muted" style={{ margin: 0 }}>{helperText}</p>
              ) : null}
              {options.map((option) => (
                <label
                  key={option}
                  style={{ display: "inline-flex", gap: 8, alignItems: "center", justifyContent: "flex-start" }}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={answer === option}
                    required={required}
                    style={radioInputStyle}
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
              {helperText ? (
                <p className="muted" style={{ margin: 0 }}>{helperText}</p>
              ) : null}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((value) => (
                  <label
                    key={value}
                    style={{ display: "inline-flex", gap: 6, alignItems: "center", justifyContent: "flex-start" }}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={value}
                      checked={answer === value}
                      required={required}
                      style={radioInputStyle}
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
                data-slider-value={sliderValue}
                required={required}
                onChange={(event) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [key]: Number(event.target.value),
                  }))
                }
              />
            </div>
          );
        }

        const textConfig = getTextConfig(question);
        return (
          <div key={question.id} style={questionContainerStyle}>
            <label style={{ color: "var(--ink)", fontWeight: 500 }}>{question.text}</label>
            {textConfig.helperText ? (
              <p className="muted" style={{ margin: 0 }}>{textConfig.helperText}</p>
            ) : null}
            <input
              type="text"
              value={typeof answer === "string" ? answer : String(answer ?? "")}
              placeholder={textConfig.placeholder}
              minLength={textConfig.minLength}
              maxLength={textConfig.maxLength}
              required={required}
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
        <Button type="submit" disabled={status === "loading" || !allQuestionsAnswered}>
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
