"use client";

import { useEffect, useMemo, useState } from "react";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { useUser } from "@/features/auth/context";
import { createDiscussionPost, getDiscussionPosts } from "@/features/projects/api/client";
import type { DiscussionPost } from "@/features/projects/types";

type DiscussionForumClientProps = {
  projectId: string;
};

export function DiscussionForumClient({ projectId }: DiscussionForumClientProps) {
  const { user, loading: userLoading } = useUser();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && body.trim().length > 0;
  const emptyState = useMemo(
    () => (
      <div className="card" style={{ padding: 20 }}>
        <p className="muted" style={{ margin: 0 }}>
          No posts yet. Start the discussion above.
        </p>
      </div>
    ),
    []
  );

  useEffect(() => {
    if (!user) return;
    setLoadingPosts(true);
    setError(null);
    getDiscussionPosts(user.id, Number(projectId))
      .then(setPosts)
      .catch((err: unknown) => {
        console.error(err);
        setError("Failed to load discussion posts.");
      })
      .finally(() => setLoadingPosts(false));
  }, [user, projectId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !user) return;

    try {
      const next = await createDiscussionPost(user.id, Number(projectId), {
        title: title.trim(),
        body: body.trim(),
      });
      setPosts((prev) => [next, ...prev]);
      setTitle("");
      setBody("");
    } catch (err) {
      console.error(err);
      setError("Failed to create post.");
    }
  };

  return (
    <div className="stack stack--tabbed">
      <ProjectNav projectId={projectId} />
      <section className="stack" style={{ padding: 24, gap: 24 }}>
        <div>
          <h1>Discussion Forum</h1>
          <p className="muted">Share updates, ask questions, and keep the team aligned.</p>
        </div>

        <form className="card stack" style={{ padding: 20 }} onSubmit={handleSubmit}>
          <div className="stack">
            <label htmlFor="discussion-title">Title</label>
            <input
              id="discussion-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Add a short, clear title"
              disabled={!user || userLoading}
            />
          </div>
          <div className="stack">
            <label htmlFor="discussion-body">Post</label>
            <textarea
              id="discussion-body"
              name="body"
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write your update or question"
              disabled={!user || userLoading}
            />
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setTitle("");
                setBody("");
              }}
              disabled={title.length === 0 && body.length === 0}
            >
              Clear
            </button>
            <button type="submit" className="btn btn--primary" disabled={!canSubmit || !user || userLoading}>
              Post
            </button>
          </div>
          {!user && !userLoading ? (
            <p className="muted" style={{ margin: 0 }}>
              Please sign in to create a post.
            </p>
          ) : null}
        </form>

        <section className="stack" aria-label="Posts">
          <h2 style={{ marginBottom: 4 }}>Latest posts</h2>
          {error ? <p className="muted">{error}</p> : null}
          {loadingPosts ? (
            <p className="muted">Loading posts…</p>
          ) : posts.length === 0 ? (
            emptyState
          ) : (
            posts.map((post) => (
              <article key={post.id} className="card stack" style={{ padding: 20 }}>
                <div className="stack" style={{ gap: 6 }}>
                  <strong>{post.title}</strong>
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    {post.author.firstName} {post.author.lastName} •{" "}
                    {new Date(post.createdAt).toLocaleString()}
                  </p>
                </div>
                <p style={{ margin: 0 }}>{post.body}</p>
              </article>
            ))
          )}
        </section>
      </section>
    </div>
  );
}
