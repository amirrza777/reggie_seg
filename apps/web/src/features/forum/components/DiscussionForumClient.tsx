"use client";

import { useEffect, useMemo, useState } from "react";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { useUser } from "@/features/auth/context";
import {
  createDiscussionPost,
  deleteDiscussionPost,
  getDiscussionPosts,
  reportDiscussionPost,
  reactToDiscussionPost,
  updateDiscussionPost,
} from "@/features/forum/api/client";
import type { DiscussionPost } from "@/features/forum/types";

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
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");
  const [savingPostId, setSavingPostId] = useState<number | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [reportingPostId, setReportingPostId] = useState<number | null>(null);
  const [reactingPostId, setReactingPostId] = useState<number | null>(null);

  const isStaff =
    Boolean(user?.isStaff) ||
    Boolean(user?.isAdmin) ||
    Boolean(user?.isEnterpriseAdmin) ||
    user?.role === "STAFF" ||
    user?.role === "ADMIN" ||
    user?.role === "ENTERPRISE_ADMIN";

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

  const startEditing = (post: DiscussionPost) => {
    setEditingPostId(post.id);
    setEditingTitle(post.title);
    setEditingBody(post.body);
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setEditingTitle("");
    setEditingBody("");
  };

  const handleUpdate = async (postId: number) => {
    if (!user) return;
    const trimmedTitle = editingTitle.trim();
    const trimmedBody = editingBody.trim();
    if (!trimmedTitle || !trimmedBody) return;

    setSavingPostId(postId);
    try {
      const updated = await updateDiscussionPost(user.id, Number(projectId), postId, {
        title: trimmedTitle,
        body: trimmedBody,
      });
      setPosts((prev) => prev.map((post) => (post.id === postId ? updated : post)));
      cancelEditing();
    } catch (err) {
      console.error(err);
      setError("Failed to update post.");
    } finally {
      setSavingPostId(null);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!user) return;
    setDeletingPostId(postId);
    try {
      await deleteDiscussionPost(user.id, Number(projectId), postId);
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      if (editingPostId === postId) cancelEditing();
    } catch (err) {
      console.error(err);
      setError("Failed to delete post.");
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleReport = async (postId: number) => {
    if (!user) return;
    setReportingPostId(postId);
    try {
      await reportDiscussionPost(user.id, Number(projectId), postId);
      setPosts((prev) => prev.filter((post) => post.id !== postId));
    } catch (err) {
      console.error(err);
      setError("Failed to report post.");
    } finally {
      setReportingPostId(null);
    }
  };

  const handleReaction = async (postId: number, type: "LIKE" | "DISLIKE") => {
    if (!user) return;
    setReactingPostId(postId);
    try {
      const updated = await reactToDiscussionPost(user.id, Number(projectId), postId, type);
      setPosts((prev) => prev.map((post) => (post.id === postId ? updated : post)));
    } catch (err) {
      console.error(err);
      setError("Failed to update reaction.");
    } finally {
      setReactingPostId(null);
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
            posts.map((post) => {
              const isAuthor = user?.id === post.author.id;
              const isEditing = editingPostId === post.id;

              return (
                <article key={post.id} className="card stack" style={{ padding: 20 }}>
                  <div className="stack" style={{ gap: 6 }}>
                    {isEditing ? (
                      <>
                        <label htmlFor={`edit-title-${post.id}`}>Title</label>
                        <input
                          id={`edit-title-${post.id}`}
                          value={editingTitle}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          disabled={savingPostId === post.id}
                        />
                        <label htmlFor={`edit-body-${post.id}`}>Post</label>
                        <textarea
                          id={`edit-body-${post.id}`}
                          rows={4}
                          value={editingBody}
                          onChange={(event) => setEditingBody(event.target.value)}
                          disabled={savingPostId === post.id}
                        />
                      </>
                    ) : (
                      <>
                        <strong>{post.title}</strong>
                        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                          {post.author.firstName} {post.author.lastName}
                          {isAuthor ? " (You)" : ""} • {new Date(post.createdAt).toLocaleString()}
                        </p>
                        {post.updatedAt !== post.createdAt ? (
                          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                            Edited: {new Date(post.updatedAt).toLocaleString()}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>

                  {isEditing ? null : <p style={{ margin: 0 }}>{post.body}</p>}

                  <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span className="muted">Score {post.reactionScore}</span>
                      {!isAuthor ? (
                        <>
                          <button
                            type="button"
                            className={`btn ${post.myReaction === "LIKE" ? "btn--primary" : "btn--ghost"}`}
                            onClick={() => handleReaction(post.id, "LIKE")}
                            disabled={reactingPostId === post.id}
                          >
                            {post.myReaction === "LIKE" ? "Liked" : "Like"}
                          </button>
                          <button
                            type="button"
                            className={`btn ${post.myReaction === "DISLIKE" ? "btn--primary" : "btn--ghost"}`}
                            onClick={() => handleReaction(post.id, "DISLIKE")}
                            disabled={reactingPostId === post.id}
                          >
                            {post.myReaction === "DISLIKE" ? "Disliked" : "Dislike"}
                          </button>
                        </>
                      ) : null}
                    </div>

                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                      {isAuthor ? (
                        isEditing ? (
                          <>
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={cancelEditing}
                              disabled={savingPostId === post.id}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn--primary"
                              onClick={() => handleUpdate(post.id)}
                              disabled={
                                savingPostId === post.id ||
                                editingTitle.trim().length === 0 ||
                                editingBody.trim().length === 0
                              }
                            >
                              Save
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="btn btn--ghost" onClick={() => startEditing(post)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={() => handleDelete(post.id)}
                              disabled={deletingPostId === post.id}
                            >
                              {deletingPostId === post.id ? "Deleting…" : "Delete"}
                            </button>
                          </>
                        )
                      ) : null}

                      {isStaff && post.author.role === "STUDENT" ? (
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => handleReport(post.id)}
                          disabled={reportingPostId === post.id}
                        >
                          {reportingPostId === post.id ? "Reporting…" : "Report"}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  
                </article>
              );
            })
          )}
        </section>
      </section>
    </div>
  );
}
