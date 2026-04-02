"use client";

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
};

export function StaffPeerStudentAssessmentsPanel({
  questionLabels,
  expectedPeerReviews,
  givenGroups,
  receivedGroups,
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

  return (
    <div className="stack" style={{ gap: 16, marginTop: 10 }}>

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
                          <h4 style={{ margin: 0, fontSize: "1rem" }}>Student feedback response</h4>
                          <p className="muted" style={{ margin: 0 }}>
                            {assessment.feedbackReview.reviewText &&
                            assessment.feedbackReview.reviewText.trim().length > 0
                              ? assessment.feedbackReview.reviewText
                              : "No written response submitted yet."}
                          </p>
                          {assessment.feedbackReview.agreementsJson &&
                          Object.keys(assessment.feedbackReview.agreementsJson).length > 0 ? (
                            <div className="stack" style={{ gap: 6 }}>
                              <strong style={{ fontSize: "0.95rem" }}>Agreement selections</strong>
                              <ul className="stack" style={{ gap: 6, margin: 0, paddingLeft: 18 }}>
                                {Object.entries(assessment.feedbackReview.agreementsJson).map(([answerId, value]) => (
                                  <li key={`${assessment.id}-agr-${answerId}`}>
                                    Answer {answerId}: {value.score} — {value.selected}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
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