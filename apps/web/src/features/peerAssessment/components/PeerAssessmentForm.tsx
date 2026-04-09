"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import type { Question } from "../types";
import { createPeerAssessment, updatePeerAssessment } from "../api/client";
import {
  formatDateLabel,
  formatRemainingDuration,
  getRatingBounds,
  getSliderConfig,
  getTextConfig,
  isQuestionAnswered,
  normalizeAnswers,
  toAnswersArray,
  toDate,
  type AnswerValue,
} from "../utils";
import "../styles/form.css";

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
  title?: string;
  assessmentOpenAt?: string | null;
  assessmentDueAt?: string | null;
  readOnly?: boolean;
};

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
  title,
  assessmentOpenAt = null,
  assessmentDueAt = null,
  readOnly = false,
}: PeerAssessmentFormProps) {
  const router = useRouter();
  const peerAssessmentsPath = `/projects/${projectId}/peer-assessments`;
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const isEditMode = !!assessmentId;
  const resolvedTitle = title ?? (isEditMode ? "Edit Peer Assessment" : "Create Peer Assessment");
  const orderedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.order - b.order),
    [questions]
  );
  const unansweredQuestions = useMemo(
    () => orderedQuestions.filter((question) => !isQuestionAnswered(question, answers[String(question.id)])),
    [orderedQuestions, answers]
  );
  const allQuestionsAnswered = unansweredQuestions.length === 0;
  const openAt = toDate(assessmentOpenAt);
  const dueAt = toDate(assessmentDueAt ?? assessmentDeadline);
  const now = new Date(currentTimestamp);
  const isBeforeOpen = Boolean(openAt && now < openAt);
  const isAfterDue = Boolean(dueAt && now > dueAt);
  const isReadOnly = readOnly || isAfterDue;
  const canSubmitWindow = !isBeforeOpen;
  const canSubmit = canSubmitWindow && !isReadOnly && allQuestionsAnswered;
  const countdownTargetTimestamp = isAfterDue
    ? null
    : isBeforeOpen && openAt
      ? openAt.getTime()
      : dueAt
        ? dueAt.getTime()
        : null;
  const remainingSeconds =
    countdownTargetTimestamp == null
      ? null
      : Math.max(0, Math.ceil((countdownTargetTimestamp - currentTimestamp) / 1000));
  const deadlineStatusMessage = isBeforeOpen
    ? `Peer assessment is locked until ${formatDateLabel(openAt)}.`
    : dueAt && !isAfterDue
        ? `Peer assessment is open. Deadline: ${formatDateLabel(dueAt)}.`
        : null;

  useEffect(() => {
    setAnswers(normalizeAnswers(initialAnswers, orderedQuestions));
  }, [initialAnswers, orderedQuestions]);

  useEffect(() => {
    if (countdownTargetTimestamp == null) return;
    const interval = window.setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [countdownTargetTimestamp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBeforeOpen) {
      setStatus("error");
      setMessage(deadlineStatusMessage ?? "Peer assessment is outside the allowed deadline window.");
      return;
    }
    if (isReadOnly) {
      setStatus("error");
      setMessage("This assessment is read-only after the deadline.");
      return;
    }
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
    setAnswers(normalizeAnswers(initialAnswers, orderedQuestions));
    setMessage(null);
  };

  const handleBack = () => {
    router.push(peerAssessmentsPath);
    router.refresh();
  };

  return (
    <form className="stack peerAssessmentForm" onSubmit={handleSubmit}>
      <div className="peerAssessmentForm__header">
        <div className="peerAssessmentForm__headerText">
          <h3 style={{ margin: 0 }}>{resolvedTitle}</h3>
          <p className="muted" style={{ margin: 0 }}>
            You&apos;re reviewing {teammateName}
          </p>
          {deadlineStatusMessage ? (
            <p className={canSubmitWindow ? "muted" : "error"} style={{ margin: 0 }}>
              {deadlineStatusMessage}
            </p>
          ) : null}
        </div>
        {remainingSeconds != null ? (
          <div data-testid="deadline-countdown" className="peerAssessmentForm__countdownBox">
            {formatRemainingDuration(remainingSeconds)}
          </div>
        ) : null}
      </div>
        {orderedQuestions.map((question) => {
        const key = String(question.id);
        const answer = answers[key];
        const required = question.configs?.required === true;
        const helperText = question.configs?.helperText;

        if (question.type === "multiple-choice") {
          const options = Array.isArray(question.configs?.options) ? question.configs.options : [];
          return (
            <div key={question.id} className="peerAssessmentForm__question">
              <label className="peerAssessmentForm__questionTitle">{question.text}</label>
              {helperText ? (
                <p className="muted" style={{ margin: 0 }}>{helperText}</p>
              ) : null}
              {options.map((option) => (
                <label key={option} className="peerAssessmentForm__optionLabel">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={answer === option}
                    required={required}
                    className="peerAssessmentForm__radioInput"
                    disabled={isReadOnly}
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
            <div key={question.id} className="peerAssessmentForm__question">
              <label className="peerAssessmentForm__questionTitle">{question.text}</label>
              {helperText ? (
                <p className="muted" style={{ margin: 0 }}>{helperText}</p>
              ) : null}
              <div className="peerAssessmentForm__ratingOptions">
                {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((value) => (
                  <label key={value} className="peerAssessmentForm__optionLabel peerAssessmentForm__optionLabel--rating">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={value}
                      checked={answer === value}
                      required={required}
                      className="peerAssessmentForm__radioInput"
                      disabled={isReadOnly}
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
            <div key={question.id} className="peerAssessmentForm__question">
              <label className="peerAssessmentForm__questionTitle">{question.text}</label>
              {config.helperText ? (
                <p className="muted" style={{ margin: 0 }}>{config.helperText}</p>
              ) : null}
              {(config.left || config.right) ? (
                <div className="peerAssessmentForm__sliderLabels">
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
                disabled={isReadOnly}
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
          <div key={question.id} className="peerAssessmentForm__question">
            <label className="peerAssessmentForm__questionTitle">{question.text}</label>
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
              readOnly={isReadOnly}
              onChange={(event) =>
                setAnswers((prev) => ({ ...prev, [key]: event.target.value }))
              }
              className="peerAssessmentForm__answerInput"
            />
          </div>
        );
      })}
      <div className="peerAssessmentForm__actions">
        {!isReadOnly ? (
          <>
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
          </>
        ) : null}
        <Button type="button" onClick={handleBack} className="peerAssessmentForm__backButton">
          Back
        </Button>
      </div>
      {message ? (
        <p className={status === "error" ? "error" : "muted"}>{message}</p>
      ) : null}
    </form>
  );
}
