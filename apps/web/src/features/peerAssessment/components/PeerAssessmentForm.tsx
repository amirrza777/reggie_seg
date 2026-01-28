"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import type { Question } from "../types";
import { createPeerAssessment } from "../api/client";

type PeerAssessmentFormProps = {
  teammateName: string;
  teamName: string;
  questions: Question[];
  moduleId: number;
  projectId?: number;
  teamId: number;
  reviewerId: number;
  revieweeId: number;
  templateId: number;
};

export function PeerAssessmentForm({
  teammateName,
  teamName,
  questions,
  moduleId,
  projectId,
  teamId,
  reviewerId,
  revieweeId,
  templateId,
}: PeerAssessmentFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);

    try {
      await createPeerAssessment({
        moduleId,
        projectId,
        teamId,
        reviewerUserId: reviewerId,
        revieweeUserId: revieweeId,
        templateId,
        answersJson: answers,
      });
      setStatus("success");
      setMessage("Assessment saved successfully!");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Failed to save assessment",
      );
    }
  };

  const handleDiscard = () => {
    setAnswers({});
    setMessage(null);
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <h1>
        {teamName} | You're reviewing {teammateName}
      </h1>
      {questions.map((question) => (
        <div key={question.id}>
          <label>{question.text}</label>
          <input
            type="text"
            value={answers[question.id] || ""}
            onChange={(e) =>
              setAnswers({ ...answers, [question.id]: e.target.value })
            }
          />
        </div>
      ))}
      <div>
        <Button type="button" onClick={handleDiscard}>
          Discard changes
        </Button>
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Saving..." : "Save"}
        </Button>
      </div>
      {message ? (
        <p className={status === "error" ? "error" : "muted"}>{message}</p>
      ) : null}
    </form>
  );
}
