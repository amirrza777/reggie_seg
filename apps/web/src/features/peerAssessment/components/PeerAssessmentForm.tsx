"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import type { Question } from "../types";

type PeerAssessmentFormProps = {
  teammateName: string;
  teamName: string;
  questions: Question[];
};

export function PeerAssessmentForm({
  teammateName,
  teamName,
  questions,
}: PeerAssessmentFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Saving assessment:", answers);
  };

  const handleDiscard = () => {
    setAnswers({});
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
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
