'use client';

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import type { Question } from "../types";
import { submitFeedback } from "../api/client";

const demoQuestions: Question[] = [
  { id: "q1", prompt: "What went well?", type: "text" },
  { id: "q2", prompt: "What could be improved?", type: "text" },
];

type FeedbackFormProps = {
  projectId?: string;
  questions?: Question[];
};

export function FeedbackForm({ projectId = "project-123", questions = demoQuestions }: FeedbackFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await submitFeedback({ projectId, answers });
      setMessage("Feedback submitted (stub).");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to submit feedback");
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      {questions.map((question) => (
        <label key={question.id} className="stack" style={{ gap: 6 }}>
          <span>{question.prompt}</span>
          <textarea
            rows={3}
            value={answers[question.id] ?? ""}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
          />
        </label>
      ))}
      <Button type="submit">Submit feedback</Button>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  );
}
