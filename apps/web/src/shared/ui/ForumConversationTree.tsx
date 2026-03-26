"use client";

export type ForumConversationTreePost = {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
  replies: ForumConversationTreePost[];
};

type ForumConversationTreeProps = {
  post: ForumConversationTreePost;
  focusPostId: number;
  depth?: number;
};

export function ForumConversationTree({ post, focusPostId, depth = 0 }: ForumConversationTreeProps) {
  return (
    <div
      className="card"
      style={{
        padding: 12,
        marginLeft: depth * 16,
        border: post.id === focusPostId ? "1px solid var(--primary)" : "1px solid var(--border)",
        background: post.id === focusPostId ? "rgba(64, 126, 255, 0.08)" : "transparent",
      }}
    >
      <div className="ui-stack-xs">
        <strong>{post.title}</strong>
        <span className="muted">
          {post.author.firstName} {post.author.lastName} - {new Date(post.createdAt).toLocaleString()}
        </span>
      </div>
      <p style={{ margin: "8px 0 0" }}>{post.body}</p>
      {post.replies.length ? (
        <div className="ui-stack-sm" style={{ marginTop: 10 }}>
          {post.replies.map((reply) => (
            <ForumConversationTree key={reply.id} post={reply} focusPostId={focusPostId} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
