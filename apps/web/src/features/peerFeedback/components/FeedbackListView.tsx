import Link from "next/link";
import { ArrowRightIcon } from "@/shared/ui/ArrowRightIcon";
import { PeerFeedback } from "../types";
import "../styles/list.css";

type FeedbackListViewProps = {
  feedbacks?: PeerFeedback[];
  projectId?: string;
  readOnly?: boolean;
};

export function FeedbackAssessmentView({ feedbacks, projectId, readOnly = false }: FeedbackListViewProps) {
  if (!feedbacks || feedbacks.length === 0) {
    return <p className="ui-note ui-note--muted">No feedbacks submitted yet.</p>;
  }

  return (
    <div>
      <ul className="feedback-list">
        {feedbacks.map((f) => {
          const isSubmitted = Boolean(f.reviewSubmitted);

          return (
            <li key={f.id} className="feedback-list__item">
              <Link
                href={`/projects/${projectId}/peer-feedback/${f.id}`}
                className="ui-link-reset"
              >
                <div
                  className={`feedback-card ${
                    isSubmitted ? "feedback-card--submitted" : "feedback-card--pending"
                  }`}
                >
                  <div className="feedback-card__content">
                    <div className="feedback-card__header">
                      <div className="feedback-card__meta">
                        From: {f.firstName} {f.lastName}
                      </div>
                      <span
                        className={`feedback-card__status ${
                          isSubmitted
                            ? "feedback-card__status--submitted"
                            : "feedback-card__status--pending"
                        }`}
                      >
                        {isSubmitted ? "Submitted" : "Pending"}
                      </span>
                    </div>
                    <div className="feedback-card__timestamp">
                      Submitted: {new Date(f.submittedAt).toLocaleString()}
                    </div>
                    <div className="feedback-card__cta">
                      {isSubmitted
                        ? (
                          <>
                            {readOnly
                              ? "Review submitted - click to view"
                              : "Review submitted - click to edit"}{" "}
                            <ArrowRightIcon />
                          </>
                        )
                        : (
                          <>
                            {readOnly
                              ? "Submission window closed - click to view"
                              : "Not submitted yet - click to review"}{" "}
                            <ArrowRightIcon />
                          </>
                        )}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
