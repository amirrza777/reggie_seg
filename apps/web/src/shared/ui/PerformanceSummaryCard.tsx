"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "./Card";
import { ProgressBar } from "./ProgressBar";

export type ReviewerAnswer = {
  reviewerId: string;
  reviewerName: string;
  score: number;
  assessmentId?: string; // link to full response
};

export type QuestionAverage = {
  questionId: number;
  questionText: string;
  averageScore: number;
  totalReviews: number;
  reviewerAnswers?: ReviewerAnswer[];
};

export type PerformanceSummaryData = {
  overallAverage: number;
  totalReviews: number;
  questionAverages: QuestionAverage[];
  maxScore?: number; // Defaults to 5 if not provided
  moduleId?: string;
  teamId?: string;
  studentId?: string;
};

type PerformanceSummaryCardProps = {
  title: string;
  data: PerformanceSummaryData;
};

export function PerformanceSummaryCard({ title, data }: PerformanceSummaryCardProps) {
  const maxScore = data.maxScore ?? 5;
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  const toggleQuestion = (questionId: number) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  return (
    <>
      <Card title={title}>
        <div className="stack" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="eyebrow">Overall Average</span>
            <strong style={{ fontSize: "1.5rem" }}>
              {data.overallAverage}
              <span className="muted" style={{ fontSize: "1rem", marginLeft: 4 }}>/ {maxScore}</span>
            </strong>
          </div>
          <ProgressBar value={(data.overallAverage / maxScore) * 100} />
          <p className="muted">
            Based on {data.totalReviews} review{data.totalReviews !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="stack" style={{ gap: 12 }}>
          {data.questionAverages.map((question) => {
            const isExpanded = expandedQuestions.has(question.questionId);
            const hasAnswers = question.reviewerAnswers && question.reviewerAnswers.length > 0;

            return (
              <article key={question.questionId} style={{ padding: "8px 0" }}>
                <div
                  style={{ 
                    cursor: hasAnswers ? "pointer" : "default",
                    marginBottom: isExpanded ? 12 : 0
                  }}
                  onClick={() => hasAnswers && toggleQuestion(question.questionId)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <h4 style={{ margin: 0 }}>
                      {question.questionText}
                      {hasAnswers && (
                        <span className="muted" style={{ marginLeft: 8, fontSize: "0.875rem" }}>
                          {isExpanded ? "▼" : "▶"}
                        </span>
                      )}
                    </h4>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <ProgressBar value={(question.averageScore / maxScore) * 100} />
                    <strong style={{ minWidth: "fit-content" }}>
                      {question.averageScore}
                      <span className="muted">/ {maxScore}</span>
                    </strong>
                  </div>
                </div>

                {isExpanded && hasAnswers && question.reviewerAnswers && (
                  <div className="stack" style={{ gap: 8, marginTop: 12, paddingLeft: 16, borderLeft: "2px solid var(--border)" }}>
                    {question.reviewerAnswers.map((answer) => (
                      <div key={answer.reviewerId} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ minWidth: "100px" }}>
                          {answer.assessmentId && data.moduleId && data.teamId && data.studentId ? (
                            <Link 
                              href={`/projects/${data.moduleId}/peer-feedback/${data.studentId}`}
                            >
                              <strong>{answer.reviewerName}</strong>
                            </Link>
                          ) : (
                            <strong>{answer.reviewerName}</strong>
                          )}
                        </div>
                        <ProgressBar value={(answer.score / maxScore) * 100} />
                        <strong style={{ minWidth: "fit-content" }}>
                          {answer.score}
                          <span className="muted">/ {maxScore}</span>
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </Card>
    </>
  );
}
