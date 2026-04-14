"use client";

import "../styles/peer-student-assessments.css";
import { useLayoutEffect, useMemo, useState } from "react";
import { AgreementTrafficLightPill } from "@/features/peerFeedback/components/AgreementTrafficLightPill";
import { Card } from "@/shared/ui/Card";
import { RichTextViewer } from "@/shared/ui/rich-text/RichTextViewer";

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
  /** The student whose peer work is being inspected (shown muted on each card). */
  focusStudentName: string;
  questionLabels: Record<string, string>;
  expectedPeerReviews: number;
  givenGroups: StaffPeerAssessmentGroup[];
  receivedGroups: StaffPeerAssessmentGroup[];
  initialPeerFocus?: { tab: TabKey; counterpartId: number } | null;
};

export function StaffPeerStudentAssessmentsPanel({
  focusStudentName,
  questionLabels,
  expectedPeerReviews,
  givenGroups,
  receivedGroups,
  initialPeerFocus = null,
}: StaffPeerStudentAssessmentsPanelProps) {
  const [tab, setTab] = useState<TabKey>(() => initialPeerFocus?.tab ?? "given");

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

  useLayoutEffect(() => {
    if (!initialPeerFocus) return;
    const id = `staff-peer-${initialPeerFocus.tab}-group-${initialPeerFocus.counterpartId}`;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [initialPeerFocus]);

  const p = "staff-projects__peer-student-assessments";

  return (
    <div className={`stack ${p}`}>
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
          <p className={`muted ${p}__empty`}>{emptyMessage}</p>
        </section>
      ) : (
        <section className="staff-projects__team-list">
          {sortedGroups.map((group) => (
            <div
              key={`${tab}-${group.counterpartId}`}
              id={`staff-peer-${tab}-group-${group.counterpartId}`}
            >
              <Card
                title={
                  <span className={`${p}__card-title`}>
                    {tab === "given" ? (
                      <>
                        <span className={`muted ${p}__title-meta`}>{focusStudentName} reviewing</span>{" "}
                        <span className={`${p}__title-name`}>{group.counterpartName}</span>
                      </>
                    ) : (
                      <>
                        <span className={`${p}__title-name`}>{group.counterpartName}</span>{" "}
                        <span className={`muted ${p}__title-meta`}>reviewing {focusStudentName}</span>
                      </>
                    )}
                  </span>
                }
              >
                <div className="stack">
                  {group.assessments.map((assessment) => {
                    const answers = Object.entries(assessment.answers ?? {});
                    return (
                      <div
                        key={assessment.id}
                        className={`staff-projects__team-card ${p}__assessment`}
                      >
                        <p className={`muted ${p}__submitted`}>
                          Submitted: {new Date(assessment.submittedAt).toLocaleString()}
                        </p>
                        {answers.length === 0 ? (
                          <p className={`muted ${p}__no-answers`}>No answers stored for this submission.</p>
                        ) : (
                          <ul className={`${p}__answers`}>
                            {answers.map(([questionId, answer]) => {
                              const agreement =
                                tab === "received" && assessment.feedbackReview?.agreementsJson
                                  ? assessment.feedbackReview.agreementsJson[questionId] ??
                                    assessment.feedbackReview.agreementsJson[String(questionId)]
                                  : undefined;
                              const hasAnswer =
                                answer != null && String(answer).trim().length > 0;
                              return (
                                <li key={`${assessment.id}-${questionId}`}>
                                  <strong className={`${p}__question-label`}>
                                    {questionLabels[questionId] ?? questionId}:
                                  </strong>
                                  <div className={`${p}__answer-row`}>
                                    <div className={`${p}__answer-body`}>
                                      {hasAnswer ? (
                                        <RichTextViewer
                                          content={String(answer)}
                                          noPadding
                                          instanceKey={`staff-peer-answer-${assessment.id}-${questionId}`}
                                        />
                                      ) : (
                                        <span className="muted">No response</span>
                                      )}
                                    </div>
                                    {agreement ? (
                                      <AgreementTrafficLightPill
                                        score={agreement.score}
                                        selected={agreement.selected}
                                      />
                                    ) : null}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        {tab === "received" && assessment.feedbackReview ? (
                          <div className={`${p}__feedback-section`}>
                            <h4 className={`${p}__feedback-heading`}>Student feedback response</h4>
                            {assessment.feedbackReview.reviewText &&
                            assessment.feedbackReview.reviewText.trim().length > 0 ? (
                              <div className={`${p}__feedback-box`}>
                                <RichTextViewer
                                  content={assessment.feedbackReview.reviewText}
                                  noPadding
                                  instanceKey={`staff-peer-feedback-${assessment.id}`}
                                />
                              </div>
                            ) : (
                              <p className={`muted ${p}__feedback-empty`}>
                                No written response submitted yet.
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
