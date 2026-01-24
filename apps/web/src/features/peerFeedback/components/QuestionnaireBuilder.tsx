import { Card } from "@/shared/ui/Card";
import type { Question } from "../types";

const demoQuestions: Question[] = [
  { id: "q1", prompt: "What went well?", type: "text" },
  { id: "q2", prompt: "What could be improved?", type: "text" },
  { id: "q3", prompt: "Collaboration score (1-5)", type: "scale" },
];

type QuestionnaireBuilderProps = {
  questions?: Question[];
};

export function QuestionnaireBuilder({ questions = demoQuestions }: QuestionnaireBuilderProps) {
  return (
    <Card title="Questionnaire">
      <ul style={{ paddingLeft: 18, margin: 0, display: "grid", gap: 8 }}>
        {questions.map((q) => (
          <li key={q.id}>
            <strong>{q.prompt}</strong> <span className="muted">({q.type})</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
