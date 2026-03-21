import { Card } from "@/shared/ui/Card";
import { ProgressBar } from "@/shared/ui/ProgressBar";

type QuestionSummary = {
  id: string;
  question: string;
  type: "text" | "multiple-choice" | "rating";
  averageScore?: number;
  totalResponses: number;
  maxScore?: number;
};

const mockQuestionSummaries: QuestionSummary[] = [
  {
    id: "1",
    question: "How would you rate their communication skills?",
    type: "rating",
    averageScore: 4.2,
    totalResponses: 15,
    maxScore: 5,
  },
  {
    id: "2",
    question: "How well do they contribute to team meetings?",
    type: "rating",
    averageScore: 3.8,
    totalResponses: 15,
    maxScore: 5,
  },
  {
    id: "3",
    question: "Rate their problem-solving abilities",
    type: "rating",
    averageScore: 4.5,
    totalResponses: 15,
    maxScore: 5,
  },
  {
    id: "4",
    question: "How would you describe their work ethic?",
    type: "text",
    totalResponses: 15,
  },
  {
    id: "5",
    question: "What is their strongest skill?",
    type: "multiple-choice",
    totalResponses: 15,
  },
];

export function AssessmentSummary() {
  return (
    <Card title="Assessment Summary">
      <div className="stack assessment-summary">
        <p className="muted assessment-summary__description">
          Average scores received from all peer assessments submitted by team members
        </p>

        <div className="stack assessment-summary__list">
          {mockQuestionSummaries.map((question) => (
            <div key={question.id} className="assessment-summary__item">
              <div className="assessment-summary__question">
                <strong>{question.question}</strong>
              </div>

              {question.type === "rating" && question.averageScore !== undefined ? (
                <div className="assessment-summary__rating-row">
                  <div className="assessment-summary__rating-bar">
                    <ProgressBar value={(question.averageScore / (question.maxScore || 5)) * 100} />
                  </div>
                  <div className="assessment-summary__rating-value">
                    <strong>{question.averageScore.toFixed(1)}</strong>
                    {question.maxScore && ` / ${question.maxScore}`}
                  </div>
                </div>
              ) : (
                <div className="muted assessment-summary__meta">
                  {question.totalResponses} response{question.totalResponses !== 1 ? "s" : ""} received
                </div>
              )}

              <div className="muted assessment-summary__footer">
                Based on {question.totalResponses} assessment{question.totalResponses !== 1 ? "s" : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
