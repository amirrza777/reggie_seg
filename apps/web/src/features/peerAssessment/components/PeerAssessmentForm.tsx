"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import type { Question } from "../types";
import { createPeerAssessment, updatePeerAssessment } from "../api/client";

const toAnswersArray = (answers: Record<string, string>) =>
  Object.entries(answers).map(([question, answer]) => ({
    question,
    answer,
  }));

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
}: PeerAssessmentFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const isEditMode = !!assessmentId;


  useEffect(() => {
    if (initialAnswers) {
      const normalized: Record<string, string> = {};
      if (typeof initialAnswers === "object") {
        Object.entries(initialAnswers).forEach(([k, v]) => {
          normalized[k] = String(v ?? "");
        });
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnswers(normalized);
    }
  }, [initialAnswers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Failed to save assessment"
      );
    }
  };

  const handleDiscard = () => {
    setAnswers(initialAnswers ? { ...initialAnswers } : {});
    setMessage(null);
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <h3>
         You're reviewing {teammateName}
      </h3>
      {questions.map((question) => (
        <div key={question.id} style={{ display: 'grid', gap: 6 }}>
          <label style={{ color: 'var(--ink)', fontWeight: 500 }}>{question.text}</label>
          <input
            type="text"
            value={answers[String(question.id)] || ""}
            onChange={(e) =>
              setAnswers({ ...answers, [String(question.id)]: e.target.value })
            }
            style={{
              padding: 8,
              border: '1px solid var(--border)',
              borderRadius: 4,
              backgroundColor: 'var(--surface)',
              color: 'var(--ink)',
              fontFamily: 'inherit',
              fontSize: 'inherit'
            }}
          />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button type="button" onClick={handleDiscard}>
          {isEditMode ? "Reset changes" : "Discard changes"}
        </Button>
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading"
            ? "Saving..."
            : isEditMode
              ? "Update Assessment"
              : "Save Assessment"}
        </Button>
        <Button type="button" onClick={() => router.back()} style={{ marginLeft: 'auto' }}>
          Back
        </Button>
      </div>
      {message ? (
        <p className={status === "error" ? "error" : "muted"}>{message}</p>
      ) : null}
    </form>
  );
}
