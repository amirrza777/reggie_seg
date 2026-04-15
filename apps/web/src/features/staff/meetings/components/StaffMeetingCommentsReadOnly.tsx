import { renderMeetingCommentContent } from "@/features/meetings/lib/meetingCommentContent";
import type { MeetingCommentRecord } from "@/features/meetings/types";
import { Card } from "@/shared/ui/Card";

type Props = {
  comments: MeetingCommentRecord[];
};

export function StaffMeetingCommentsReadOnly({ comments }: Props) {
  const sorted = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <Card title="Comments">
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>
          Team comments are shown below. Staff cannot add or remove comments.
        </p>
        {sorted.length === 0 ? <p className="muted">No comments on this meeting.</p> : null}
        {sorted.map((comment) => (
          <div key={comment.id} className="comment">
            <div className="comment__header">
              <div className="comment__meta">
                <strong>
                  {comment.user.firstName} {comment.user.lastName}
                </strong>
                <span className="muted"> — {new Date(comment.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <div className="comment__body">{renderMeetingCommentContent(comment.content)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
