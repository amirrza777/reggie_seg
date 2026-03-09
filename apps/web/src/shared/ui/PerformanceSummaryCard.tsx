"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "./Card";
import { ProgressBar } from "./ProgressBar";

export type ReviewerAnswer = {
  reviewerId: string;
  reviewerName: string;
  score: number;
  assessmentId?: string;
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
  maxScore?: number;
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
    <Card title={title}>
      <div className="stack performance-summary">
        <div className="performance-summary__header">
          <span className="eyebrow">Overall Average</span>
          <strong className="performance-summary__score">
            {data.overallAverage}
            <span className="muted performance-summary__score-max">/ {maxScore}</span>
          </strong>
        </div>
        <ProgressBar value={(data.overallAverage / maxScore) * 100} />
        <p className="muted">
          Based on {data.totalReviews} review{data.totalReviews !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="stack performance-summary__questions">
        {data.questionAverages.map((question) => {
          const isExpanded = expandedQuestions.has(question.questionId);
          const hasAnswers = question.reviewerAnswers && question.reviewerAnswers.length > 0;

          return (
            <article key={question.questionId} className="performance-summary__question">
              <div
                className={`performance-summary__question-trigger${hasAnswers ? "" : " is-static"}`}
                onClick={() => hasAnswers && toggleQuestion(question.questionId)}
              >
                <div className="performance-summary__question-title-row">
                  <h4 className="performance-summary__question-title">
                    {question.questionText}
                    {hasAnswers && (
                      <span className="muted performance-summary__toggle">
                        {isExpanded ? "▼" : "▶"}
                      </span>
                    )}
                  </h4>
                </div>
                <div className="performance-summary__metric-row">
                  <ProgressBar value={(question.averageScore / maxScore) * 100} />
                  <strong className="performance-summary__metric-score">
                    {question.averageScore}
                    <span className="muted">/ {maxScore}</span>
                  </strong>
                </div>
              </div>

              {isExpanded && hasAnswers && question.reviewerAnswers && (
                <div className="stack performance-summary__answers">
                  {question.reviewerAnswers.map((answer) => (
                    <div key={answer.reviewerId} className="performance-summary__answer">
                      <div className="performance-summary__answer-name">
                        {answer.assessmentId && data.moduleId && data.teamId && data.studentId ? (
                          <Link href={`/projects/${data.moduleId}/peer-feedback/${data.studentId}`}>
                            <strong>{answer.reviewerName}</strong>
                          </Link>
                        ) : (
                          <strong>{answer.reviewerName}</strong>
                        )}
                      </div>
                      <ProgressBar value={(answer.score / maxScore) * 100} />
                      <strong className="performance-summary__answer-score">
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
  );
}
