"use client";

import { RichTextViewer } from "./RichTextViewer";
import "@/features/forum/styles/discussion-forum.css";

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
  const isRoot = depth === 0;
  const isFocus = post.id === focusPostId;

  return (
    <div
      className={`card discussion-post ${isRoot ? "discussion-post--root" : "discussion-post--reply"}`}
      style={{
        padding: 12,
        marginLeft: depth * 16,
        border: isFocus ? "1px solid var(--primary)" : undefined,
        background: isFocus ? "rgba(64, 126, 255, 0.08)" : undefined,
      }}
    >
      <div className="discussion-post__header">
        {post.title ? (
          <div className="discussion-post__title-row">
            <div className="discussion-post__headline">
              <strong className="discussion-post__title">{post.title}</strong>
            </div>
          </div>
        ) : null}
        <div className="discussion-post__meta-row">
          <p className="discussion-post__meta">
            {post.author.firstName} {post.author.lastName} · {new Date(post.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="discussion-post__body">
        <RichTextViewer content={post.body} />
      </div>
      {post.replies.length ? (
        <div className="ui-stack-sm discussion-post__replies" style={{ marginTop: 10 }}>
          {post.replies.map((reply) => (
            <ForumConversationTree key={reply.id} post={reply} focusPostId={focusPostId} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
