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
        {feedbacks.map((f) => (
          <li key={f.id} className="feedback-list__item">
            <Link
              href={`/projects/${projectId}/peer-feedback/${f.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="feedback-card">
                <div>
                  <div className="feedback-card__meta">From: {f.firstName} {f.lastName}</div>
                  <div className="feedback-card__timestamp">
                    Submitted: {new Date(f.submittedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
