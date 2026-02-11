import Link from "next/link";
import { PeerFeedback } from "../types";

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
      <ul style={{ paddingLeft: 0, margin: 0, display: "grid", gap: 8 }}>
        {feedbacks.map((f) => (
          <li key={f.id} style={{ listStyle: "none" }}>
            <Link
              href={`/projects/${projectId}/peer-feedback/${f.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ border: "1px solid var(--border)", padding: 12, borderRadius: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>From: {f.firstName} {f.lastName}</div>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Submitted: {new Date(f.submittedAt).toLocaleString()}</div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
