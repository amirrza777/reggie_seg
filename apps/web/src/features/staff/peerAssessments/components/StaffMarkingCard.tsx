"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { FormField } from "@/shared/ui/FormField";
import { RichTextEditor } from "@/shared/ui/rich-text/RichTextEditor";
import {
  saveStudentMarking,
  saveTeamMarking,
  type StaffMarkingSummary,
} from "../api/client";

type StaffMarkingCardProps = {
  title: string;
  description: string;
  staffId: number;
  moduleId: number;
  teamId: number;
  studentId?: number;
  initialMarking: StaffMarkingSummary | null;
  readOnly?: boolean;
};

type SaveState = "idle" | "saving" | "success" | "error";

function formatMarkerName(marking: StaffMarkingSummary | null) {
  if (!marking) return "Not yet marked";
  const markerName = `${marking.marker.firstName} ${marking.marker.lastName}`.trim();
  return markerName.length > 0 ? markerName : `Staff ${marking.marker.id}`;
}

function formatStableDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return `${new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date)} UTC`;
}

export function StaffMarkingCard({
  title,
  description,
  staffId,
  moduleId,
  teamId,
  studentId,
  initialMarking,
  readOnly = false,
}: StaffMarkingCardProps) {
  const [marking, setMarking] = useState<StaffMarkingSummary | null>(initialMarking);
  const [markInput, setMarkInput] = useState(
    initialMarking?.mark == null ? "" : String(initialMarking.mark)
  );
  const [feedback, setFeedback] = useState(initialMarking?.formativeFeedback ?? "");
  const [feedbackEmpty, setFeedbackEmpty] = useState(!initialMarking?.formativeFeedback);
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const submitLabel = state === "saving" ? "Saving..." : marking ? "Update marking" : "Save marking";

  async function submitMarking(mark: number | null, formativeFeedback: string | null) {
    setState("saving");
    setMessage(null);
    try {
      const payload = { mark, formativeFeedback };
      const saved = studentId
        ? await saveStudentMarking(staffId, moduleId, teamId, studentId, payload)
        : await saveTeamMarking(staffId, moduleId, teamId, payload);

      setMarking(saved);
      setMarkInput(saved.mark == null ? "" : String(saved.mark));
      setFeedback(saved.formativeFeedback ?? "");
      setFeedbackEmpty(!saved.formativeFeedback);
      setState("success");
      setMessage("Marking and formative feedback saved.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not save marking.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;

    const trimmedMark = markInput.trim();
    let parsedMark: number | null = null;

    if (trimmedMark.length > 0) {
      const numeric = Number(trimmedMark);
      if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
        setState("error");
        setMessage("Mark must be a number between 0 and 100.");
        return;
      }
      parsedMark = Math.round(numeric * 100) / 100;
    }

    const parsedFeedback = feedbackEmpty ? null : feedback;
    await submitMarking(parsedMark, parsedFeedback);
  }

  async function handleClear() {
    if (readOnly) return;
    await submitMarking(null, null);
  }

  return (
    <Card title={title}>
      <p className="muted">{description}</p>

      <p className="ui-note ui-note--muted" style={{ marginTop: 8 }}>
        Last updated by {formatMarkerName(marking)}
        {marking ? ` on ${formatStableDateTime(marking.updatedAt)}` : ""}.
      </p>

      {readOnly ? (
        <p className="ui-note ui-note--muted" style={{ marginTop: 8 }}>
          This module is archived; marking is read-only.
        </p>
      ) : null}

      <form className="stack" style={{ marginTop: 12 }} onSubmit={handleSubmit}>
        <label className="stack" style={{ gap: 6 }}>
          <span>Mark (0-100)</span>
          <FormField
            type="number"
            min={0}
            max={100}
            step={0.1}
            inputMode="decimal"
            value={markInput}
            onChange={(event) => setMarkInput(event.target.value)}
            placeholder="e.g. 72.5"
            disabled={readOnly || state === "saving"}
          />
        </label>

        <div className="stack" style={{ gap: 6 }}>
          <span>Formative feedback</span>
          <RichTextEditor
            key={marking?.updatedAt ?? "new"}
            initialContent={feedback}
            onChange={setFeedback}
            onEmptyChange={setFeedbackEmpty}
            placeholder="Write specific strengths, issues, and next actions."
            readOnly={readOnly}
          />
        </div>

        {readOnly ? null : (
        <div className="ui-row ui-row--wrap">
          <Button type="submit" disabled={state === "saving"}>
            {submitLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={state === "saving"}
            onClick={handleClear}
          >
            Clear
          </Button>
        </div>
        )}

        {message ? (
          <p className={state === "error" ? "error" : "muted"}>{message}</p>
        ) : null}
      </form>
    </Card>
  );
}
