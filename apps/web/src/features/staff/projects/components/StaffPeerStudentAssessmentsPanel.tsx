"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/shared/ui/Card";

export type StaffPeerSerialisedAssessment = {
  id: string;
  submittedAt: string;
  answers: Record<string, string | number | boolean | null>;
};

export type StaffPeerAssessmentGroup = {
  counterpartId: number;
  counterpartName: string;
  assessments: Array<
    StaffPeerSerialisedAssessment & {
      feedbackReview?: {
        reviewText: string | null;
        agreementsJson: Record<string, { selected: string; score: number }> | null;
      };
    }
  >;
};

type TabKey = "given" | "received";

type StaffPeerStudentAssessmentsPanelProps = {
  questionLabels: Record<string, string>;
  expectedPeerReviews: number;
  givenGroups: StaffPeerAssessmentGroup[];
  receivedGroups: StaffPeerAssessmentGroup[];
  backHref?: string;
};

export function StaffPeerStudentAssessmentsPanel({
  questionLabels,
  expectedPeerReviews,
  givenGroups,
  receivedGroups,
  backHref,
}: StaffPeerStudentAssessmentsPanelProps) {
  const [tab, setTab] = useState<TabKey>("given");

  const groups = tab === "given" ? givenGroups : receivedGroups;
  const emptyMessage =
    tab === "given"
      ? "This student has not submitted any peer assessments about teammates yet."
      : "No peer assessments from teammates are recorded for this student yet.";

  const toggleClass = (active: boolean) =>
    `pill-nav__link${active ? " pill-nav__link--active" : ""}`;

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.counterpartName.localeCompare(b.counterpartName)),
    [groups]
  );

  const tabCountLabel = (done: number) =>
    expectedPeerReviews > 0 ? `${done}/${expectedPeerReviews}` : String(done);

  function humanizeLegacyAgreementKey(key: string) {
    return key
      .replace(/^question/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim()
      .replace(/^./, (char) => char.toUpperCase());
  }

  function resolveAgreementQuestionLabel({
    agreementKey,
    agreementIndex,
    answers,
  }: {
    agreementKey: string;
    agreementIndex: number;
    answers: Array<[string, string | number | boolean | null]>;
  }) {
    const directMatch = questionLabels[agreementKey];
    if (directMatch) return directMatch;

    const answerBySameKey = answers.find(([answerKey]) => answerKey === agreementKey);
    if (answerBySameKey) {
      const label = questionLabels[answerBySameKey[0]];
      if (label) return label;
    }

    const answerByIndex = answers[agreementIndex];
    if (answerByIndex) {
      const [answerKey] = answerByIndex;
      const label = questionLabels[answerKey];
      if (label) return label;
      return answerKey;
    }

    const legacy = humanizeLegacyAgreementKey(agreementKey);
    return legacy.length > 0 ? legacy : `Question ${agreementKey}`;
  }

  return (
    <div className="stack" style={{ gap: 16, marginTop: 10 }}>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div className="pill-nav" role="tablist">
          <button
            type="button"
            role="tab"
            className={toggleClass(tab === "given")}
            onClick={() => setTab("given")}
          >
            Assessments given ({tabCountLabel(givenGroups.length)})
          </button>
          <button
            type="button"
            role="tab"
            className={toggleClass(tab === "received")}
            onClick={() => setTab("received")}
          >
            Assessments received ({tabCountLabel(receivedGroups.length)})
          </button>
        </div>
        {backHref ? (
          <Link href={backHref} className="pill-nav__link">
            ← Back to peer overview
          </Link>
        ) : null}
      </div>

      {sortedGroups.length === 0 ? (
        <section className="staff-projects__team-card">
          <p className="muted" style={{ margin: 0 }}>
            {emptyMessage}
          </p>
        </section>
      ) : (
        <section className="staff-projects__team-list">
          {sortedGroups.map((group) => (
            <Card key={`${tab}-${group.counterpartId}`} title={group.counterpartName}>
              <div className="stack" style={{ gap: 16 }}>
                {group.assessments.map((assessment) => {
                  const answers = Object.entries(assessment.answers ?? {});
                  return (
                    <div
                      key={assessment.id}
                      className="staff-projects__team-card"
                      style={{ margin: 0, padding: "12px 14px" }}
                    >
                      <p className="muted" style={{ margin: "0 0 10px" }}>
                        Submitted: {new Date(assessment.submittedAt).toLocaleString()}
                      </p>
                      {answers.length === 0 ? (
                        <p className="muted" style={{ margin: 0 }}>No answers stored for this submission.</p>
                      ) : (
                        <ul className="stack" style={{ gap: 10, margin: 0, paddingLeft: 18 }}>
                          {answers.map(([questionId, answer]) => (
                            <li key={`${assessment.id}-${questionId}`}>
                              <strong>{questionLabels[questionId] ?? questionId}:</strong>{" "}
                              {answer == null || String(answer).length === 0 ? "No response" : String(answer)}
                            </li>
                          ))}
                        </ul>
                      )}

                      {tab === "received" && assessment.feedbackReview ? (
                        <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                          <h4 style={{ margin: 0, fontSize: "1rem" }}>Feedback review</h4>
                          {assessment.feedbackReview.agreementsJson &&
                          Object.keys(assessment.feedbackReview.agreementsJson).length > 0 ? (
                            <div className="stack" style={{ gap: 6 }}>
                              <strong style={{ fontSize: "0.95rem" }}>Ratings by question</strong>
                              <ul className="stack" style={{ gap: 6, margin: 0, paddingLeft: 18 }}>
                                {Object.entries(assessment.feedbackReview.agreementsJson).map(
                                  ([answerId, value], agreementIndex) => (
                                  <li key={`${assessment.id}-agr-${answerId}`}>
                                    <strong>
                                      {resolveAgreementQuestionLabel({
                                        agreementKey: answerId,
                                        agreementIndex,
                                        answers,
                                      })}
                                      :
                                    </strong>{" "}
                                    {value.selected ?? "Reasonable"} (
                                    {typeof value.score === "number" && Number.isFinite(value.score) ? value.score : 3}/5)
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="muted" style={{ margin: 0 }}>No rating selections recorded.</p>
                          )}

                          <details>
                            <summary style={{ cursor: "pointer" }}>View written feedback</summary>
                            <p className="muted" style={{ margin: "8px 0 0" }}>
                              {assessment.feedbackReview.reviewText &&
                              assessment.feedbackReview.reviewText.trim().length > 0
                                ? assessment.feedbackReview.reviewText
                                : "No written response submitted yet."}
                            </p>
                          </details>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
