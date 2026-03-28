"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { RichTextEditor } from "@/shared/ui/RichTextEditor";
import { RichTextViewer } from "@/shared/ui/RichTextViewer";
import type { PeerFeedback, Answer, AgreementOption, AgreementsMap, PeerAssessmentReviewPayload } from "../types";
import { AGREEMENT_OPTIONS } from "../types";
import { submitPeerFeedback } from "../api/client";
import "../styles/form.css";

type FeedbackReviewFormProps = {
  feedback: PeerFeedback;
  onSubmit?: (payload: PeerAssessmentReviewPayload) => Promise<void>;
  initialReview?: string | null;
  initialAgreements?: AgreementsMap | null;
  redirectTo?: "back" | string;
  currentUserId: string;
  feedbackDeadline?: string | null;
  feedbackOpenAt?: string | null;
  feedbackDueAt?: string | null;
  readOnly?: boolean;
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
const countdownBoxStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 10px",
  background: "var(--surface)",
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
};

function getAnswerKey(answer: Answer) {
  return answer.questionId ?? answer.id;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateLabel(value: Date | null): string {
  return value ? value.toLocaleString() : "Not set";
}

function formatRemainingDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const two = (value: number) => String(value).padStart(2, "0");
  return `${two(days)}d : ${two(hours)}h : ${two(minutes)}m : ${two(seconds)}s`;
}

function renderAnswerPreview(answer: Answer) {
  const type = answer.type ?? "text";

  if (type === "multiple-choice") {
    const options = Array.isArray(answer.configs?.options) ? answer.configs.options : [];
    const selected = answer.answer == null ? "" : String(answer.answer);

    if (options.length === 0) {
      return <p className="answerText">{selected || "No response"}</p>;
    }

    return (
      <div className="answerPreviewGroup">
        {options.map((option) => (
          <label key={`${answer.id}-option-${option}`} className="answerPreviewOption">
            <input type="radio" style={radioInputStyle} checked={selected === option} readOnly disabled />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (type === "rating") {
    const min = typeof answer.configs?.min === "number" ? answer.configs.min : 1;
    const configuredMax = typeof answer.configs?.max === "number" ? answer.configs.max : min + 4;
    const max = configuredMax >= min ? configuredMax : min;
    const selected = toNumber(answer.answer);

    return (
      <div className="answerPreviewGroup answerPreviewGroup--rating">
        {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((value) => (
          <label key={`${answer.id}-rating-${value}`} className="answerPreviewOption">
            <input type="radio" style={radioInputStyle} checked={selected === value} readOnly disabled />
            <span>{value}</span>
          </label>
        ))}
      </div>
    );
  }

  if (type === "slider") {
    const min = typeof answer.configs?.min === "number" ? answer.configs.min : 0;
    const configuredMax = typeof answer.configs?.max === "number" ? answer.configs.max : min + 100;
    const max = configuredMax >= min ? configuredMax : min;
    const step = typeof answer.configs?.step === "number" && answer.configs.step > 0 ? answer.configs.step : 1;
    const selected = toNumber(answer.answer);
    const sliderValue = selected == null ? min : selected;

    return (
      <div className="answerPreviewSlider">
        {answer.configs?.helperText ? <p className="muted" style={{ margin: 0 }}>{answer.configs.helperText}</p> : null}
        {answer.configs?.left || answer.configs?.right ? (
          <div className="answerPreviewSliderLabels">
            <span>{answer.configs?.left}</span>
            <span>{answer.configs?.right}</span>
          </div>
        ) : null}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          data-slider-value={sliderValue}
          readOnly
          disabled
        />
      </div>
    );
  }

  const textValue = answer.answer == null ? "" : String(answer.answer);
  return (
    <input
      type="text"
      className="answerPreviewInput"
      value={textValue}
      readOnly
      placeholder={answer.configs?.placeholder}
    />
  );
}

export function FeedbackReviewForm({
  feedback,
  onSubmit,
  initialReview,
  initialAgreements,
  redirectTo = "back",
  currentUserId,
  feedbackDeadline = null,
  feedbackOpenAt = null,
  feedbackDueAt = null,
  readOnly = false,
}: FeedbackReviewFormProps) {
  const router = useRouter();
  const [review, setReview] = useState<string>(initialReview ?? "");
  const [reviewEmpty, setReviewEmpty] = useState(!initialReview);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!initialReview && !readOnly);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const editingMode = !!initialReview;

  const openAt = toDate(feedbackOpenAt);
  const dueAt = toDate(feedbackDueAt ?? feedbackDeadline);
  const now = new Date(currentTimestamp);
  const isBeforeOpen = Boolean(openAt && now < openAt);
  const isAfterDue = Boolean(dueAt && now > dueAt);
  const isReadOnly = readOnly || isAfterDue;
  const canSubmit = !isBeforeOpen && !isReadOnly;
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
    ? `Peer feedback is locked until ${formatDateLabel(openAt)}.`
    : dueAt && !isAfterDue
        ? `Peer feedback is open. Deadline: ${formatDateLabel(dueAt)}.`
        : null;

  const [agreements, setAgreements] = useState<AgreementsMap>(() => {
    return Object.fromEntries(
      (feedback.answers ?? []).map((a) => [
        getAnswerKey(a),
        initialAgreements?.[getAnswerKey(a)] ?? initialAgreements?.[a.id] ?? {
          selected: "Reasonable",
          score: 3,
        },
      ])
    );
  });
  useEffect(() => {
    if (countdownTargetTimestamp == null) return;
    const interval = window.setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [countdownTargetTimestamp]);

  useEffect(() => {
    if (isReadOnly && isEditing) {
      setIsEditing(false);
    }
  }, [isReadOnly, isEditing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isBeforeOpen) {
      setMessage(deadlineStatusMessage ?? "Peer feedback is outside the allowed deadline window.");
      return;
    }
    if (isReadOnly) {
      setMessage("This feedback is read-only after the deadline.");
      return;
    }
    if (reviewEmpty) {
      setMessage("Please provide a review before submitting.");
      return;
    }

    setMessage(null);
    setIsLoading(true);
    try {
      const payload: PeerAssessmentReviewPayload = {
        reviewText: review,
        agreements,
      };

      if (onSubmit) {
        await onSubmit(payload);
      } else {
        await submitPeerFeedback(String(feedback.id), payload, currentUserId, String(feedback.reviewerId));
      }

      setMessage("Peer feedback submitted successfully.");

      if (redirectTo === "back") {
        if (feedback.projectId) {
          router.push(`/projects/${feedback.projectId}/peer-feedback`);
          router.refresh();
        } else {
          router.back();
        }
      } else if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      } else if (feedback.projectId) {
        router.push(`/projects/${feedback.projectId}/peer-feedback`);
        router.refresh();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to submit peer feedback");
    } finally {
      setIsLoading(false);
    }
  }

  function handleBack() {
    if (feedback.projectId) {
      router.push(`/projects/${feedback.projectId}/peer-feedback`);
      return;
    }
    router.back();
  }

  return (
    <div className="stack feedbackReviewForm">
      <div className="headerContainer">
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ margin: 0 }}>{editingMode && !isEditing ? "View Review" : "Respond to Feedback"}</h3>
          <p className="muted" style={{ margin: 0 }}>
            Share your thoughts about this feedback from {feedback.firstName} {feedback.lastName}
          </p>
          {deadlineStatusMessage ? (
            <p className={canSubmit ? "muted" : "error"} style={{ margin: 0 }}>
              {deadlineStatusMessage}
            </p>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {remainingSeconds != null ? (
            <div data-testid="deadline-countdown" style={countdownBoxStyle}>
              {formatRemainingDuration(remainingSeconds)}
            </div>
          ) : null}
          {editingMode && !isEditing && !isReadOnly ? (
            <Button onClick={() => setIsEditing(true)} disabled={isLoading || !canSubmit}>
              Edit
            </Button>
          ) : null}
        </div>
      </div>
      <form className="stack" onSubmit={handleSubmit}>
        <div className="stack reviewLabel">
          <span>Your Review</span>
          {isEditing ? (
            <RichTextEditor
              initialContent={review}
              onChange={setReview}
              onEmptyChange={setReviewEmpty}
              placeholder="Type your response here..."
              showWordCount
            />
          ) : (
            <div className="reviewBox">
              {review ? <RichTextViewer content={review} /> : <p className="reviewText">(No review provided)</p>}
            </div>
          )}
        </div>

        <div className="agreementSection">
          <h4 className="agreementTitle">Agree with each answer?</h4>
          <p className="muted">Select how much you agree or disagree with each provided answer.</p>
          <ul className="answersList">
            {(feedback.answers || []).map((a: Answer) => (
              <li key={a.id} className="answerItem">
                <strong className="answerQuestion">{a.question}</strong>
                {renderAnswerPreview(a)}
                <label className="labelBlock">
                  {isEditing ? (
                    <select
                      value={agreements[getAnswerKey(a)]?.selected ?? "Reasonable"}
                      onChange={(e) => {
                        const selected = e.target.value as AgreementOption;
                        const score = AGREEMENT_OPTIONS.find((option) => option.label === selected)?.score ?? 3;
                        setAgreements((prev) => ({ ...prev, [getAnswerKey(a)]: { selected, score } }));
                      }}
                      disabled={isLoading}
                      className="select agreementSelect"
                    >
                      {AGREEMENT_OPTIONS.map((option) => (
                        <option key={option.label} value={option.label}>
                          {option.score} — {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="agreementBadge">
                      {agreements[getAnswerKey(a)]?.score} — {agreements[getAnswerKey(a)]?.selected ?? "Not selected"}
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </div>

        {isEditing ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button type="submit" disabled={isLoading || !canSubmit}>
              {isLoading ? "Submitting..." : editingMode ? "Update Review" : "Submit Review"}
            </Button>
            <Button type="button" onClick={handleBack} disabled={isLoading}>
              Back
            </Button>
          </div>
        ) : (
          <Button onClick={handleBack}>Back</Button>
        )}
        {message ? <p className={message.includes("success") ? "" : "muted"}>{message}</p> : null}
      </form>
    </div>
  );
}
