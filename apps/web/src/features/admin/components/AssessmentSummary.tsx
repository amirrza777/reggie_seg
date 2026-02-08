import { Card } from "@/shared/ui/Card";

type QuestionSummary = {
  id: string;
  question: string;
  type: "text" | "multiple-choice" | "rating";
  averageScore?: number;
  totalResponses: number;
  maxScore?: number;
};

// TODO: Replace with actual data from database
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
      <div className="stack" style={{ gap: 16 }}>
        <p className="muted" style={{ margin: 0 }}>
          Average scores received from all peer assessments submitted by team members
        </p>
        
        <div className="stack" style={{ gap: 12 }}>
          {mockQuestionSummaries.map((question) => (
            <div
              key={question.id}
              style={{
                padding: 12,
                border: "1px solid var(--accent-border)",
                borderRadius: 8,
                background: "var(--accent-soft)",
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <strong>{question.question}</strong>
              </div>
              
              {question.type === "rating" && question.averageScore !== undefined ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        width: "100%",
                        height: 8,
                        borderRadius: 999,
                        background: "var(--accent-border)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${(question.averageScore / (question.maxScore || 5)) * 100}%`,
                          height: "100%",
                          background: "var(--accent)",
                          transition: "width 0.2s ease",
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ minWidth: "fit-content", fontSize: "0.9rem" }}>
                    <strong>{question.averageScore.toFixed(1)}</strong>
                    {question.maxScore && ` / ${question.maxScore}`}
                  </div>
                </div>
              ) : (
                <div className="muted" style={{ fontSize: "0.9rem" }}>
                  {question.totalResponses} response{question.totalResponses !== 1 ? "s" : ""} received
                </div>
              )}
              
              <div className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
                Based on {question.totalResponses} assessment{question.totalResponses !== 1 ? "s" : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
