import { PeerFeedback } from "../types";

type FeedbackListViewProps = {
  feedbacks?: PeerFeedback[];  
};

export function FeedbackListView({ feedbacks }: FeedbackListViewProps) {
  
    return (
    <div>
      <h2>Feedback from your peers</h2>
        <ul style={{ paddingLeft: 18, margin: 0, display: "grid", gap: 8 }}>
        {feedbacks?.map((f) => (
          <li key={f.id}>
            <strong>Reviewer : {f.firstName} {f.lastName} </strong>
            <p>Submitted At: {new Date(f.submittedAt).toLocaleString()}</p>
        </li>
        ))}
        </ul>
    </div>
  );
}
