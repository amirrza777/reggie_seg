import Link from "next/link";
import { PeerFeedback } from "../types";
import "../styles/list.css";

type FeedbackListViewProps = {
  feedbacks?: PeerFeedback[];
  projectId?: string;
};

export function FeedbackAssessmentView({ feedbacks, projectId }: FeedbackListViewProps) {
  if (!feedbacks || feedbacks.length === 0) {
    return <p>No feedbacks submitted yet.</p>;
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
                style={{ textDecoration: "none", color: "inherit" }}
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
                        ? "Review submitted - click to edit →"
                        : "Not submitted yet - click to review →"}
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
