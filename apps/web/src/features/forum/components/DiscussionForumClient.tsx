"use client";

import { useEffect, useMemo, useState } from "react";
import { ProjectNav } from "@/features/projects/components/ProjectNav";
import { useUser } from "@/features/auth/context";
import {
  createDiscussionPost,
  createStudentForumReport,
  deleteDiscussionPost,
  getDiscussionPosts,
  reportDiscussionPost,
  reactToDiscussionPost,
  updateDiscussionPost,
} from "@/features/forum/api/client";
import type { DiscussionPost } from "@/features/forum/types";

type DiscussionForumClientProps = {
  projectId: string;
  showProjectNav?: boolean;
};

export function DiscussionForumClient({ projectId, showProjectNav = true }: DiscussionForumClientProps) {
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
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [savingReplyPostId, setSavingReplyPostId] = useState<number | null>(null);
  const [collapsedReplyIds, setCollapsedReplyIds] = useState<Record<number, boolean>>({});
  const [expandedDepthByPostId, setExpandedDepthByPostId] = useState<Record<number, number>>({});
  const [showAllImmediateRepliesByPostId, setShowAllImmediateRepliesByPostId] = useState<Record<number, boolean>>({});
  const [replyOpenByPostId, setReplyOpenByPostId] = useState<Record<number, boolean>>({});
  const [hoveredPostId, setHoveredPostId] = useState<number | null>(null);

  const isStaff =
    Boolean(user?.isStaff) ||
    Boolean(user?.isAdmin) ||
    Boolean(user?.isEnterpriseAdmin) ||
    user?.role === "STAFF" ||
    user?.role === "ADMIN" ||
    user?.role === "ENTERPRISE_ADMIN";
  const isStudent = user?.role === "STUDENT";

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

  const addReplyToTree = (items: DiscussionPost[], parentPostId: number, reply: DiscussionPost) =>
    items.map((post) => {
      if (post.id === parentPostId) {
        return { ...post, replies: [...post.replies, reply] };
      }
      if (post.replies.length === 0) return post;
      return { ...post, replies: addReplyToTree(post.replies, parentPostId, reply) };
    });

  const updatePostInTree = (items: DiscussionPost[], updated: DiscussionPost): DiscussionPost[] =>
    items.map((post) => {
      if (post.id === updated.id) {
        return updated;
      }
      if (post.replies.length === 0) return post;
      return { ...post, replies: updatePostInTree(post.replies, updated) };
    });

  const updateReportStatusInTree = (
    items: DiscussionPost[],
    postId: number,
    status: DiscussionPost["myStudentReportStatus"]
  ): DiscussionPost[] =>
    items.map((post) => {
      if (post.id === postId) {
        return { ...post, myStudentReportStatus: status ?? null };
      }
      if (post.replies.length === 0) return post;
      return { ...post, replies: updateReportStatusInTree(post.replies, postId, status) };
    });

  const removePostFromTree = (items: DiscussionPost[], postId: number): DiscussionPost[] =>
    items
      .filter((post) => post.id !== postId)
      .map((post) => ({
        ...post,
        replies: post.replies.length ? removePostFromTree(post.replies, postId) : post.replies,
      }));

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

  const handleUpdate = async (post: DiscussionPost) => {
    if (!user) return;
    const trimmedTitle = post.parentPostId === null ? editingTitle.trim() : post.title;
    const trimmedBody = editingBody.trim();
    if ((post.parentPostId === null && !trimmedTitle) || !trimmedBody) return;

    setSavingPostId(post.id);
    try {
      const updated = await updateDiscussionPost(user.id, Number(projectId), post.id, {
        title: trimmedTitle,
        body: trimmedBody,
      });
      setPosts((prev) => updatePostInTree(prev, updated));
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
      setPosts((prev) => removePostFromTree(prev, postId));
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
    if (!window.confirm("Report this post to staff?")) return;
    setReportingPostId(postId);
    try {
      await reportDiscussionPost(user.id, Number(projectId), postId);
      setPosts((prev) => removePostFromTree(prev, postId));
    } catch (err) {
      console.error(err);
      setError("Failed to report post.");
    } finally {
      setReportingPostId(null);
    }
  };

  const handleStudentReport = async (postId: number) => {
    if (!user) return;
    if (!window.confirm("Report this post to project staff?")) return;
    setReportingPostId(postId);
    try {
      await createStudentForumReport(user.id, Number(projectId), postId);
      setPosts((prev) => updateReportStatusInTree(prev, postId, "PENDING"));
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
      setPosts((prev) => updatePostInTree(prev, updated));
    } catch (err) {
      console.error(err);
      setError("Failed to update reaction.");
    } finally {
      setReactingPostId(null);
    }
  };

  const handleReplyChange = (postId: number, value: string) => {
    setReplyDrafts((prev) => ({ ...prev, [postId]: value }));
  };

  const handleReplySubmit = async (parentPostId: number) => {
    if (!user) return;
    const draft = replyDrafts[parentPostId] ?? "";
    const trimmed = draft.trim();
    if (!trimmed) return;

    setSavingReplyPostId(parentPostId);
    try {
      const reply = await createDiscussionPost(user.id, Number(projectId), {
        title: "",
        body: trimmed,
        parentPostId,
      });
      setPosts((prev) => addReplyToTree(prev, parentPostId, reply));
      setReplyDrafts((prev) => ({ ...prev, [parentPostId]: "" }));
      setReplyOpenByPostId((prev) => ({ ...prev, [parentPostId]: false }));
    } catch (err) {
      console.error(err);
      setError("Failed to add reply.");
    } finally {
      setSavingReplyPostId(null);
    }
  };

  const toggleReplies = (postId: number, shouldExpand: boolean) => {
    setCollapsedReplyIds((prev) => ({ ...prev, [postId]: !shouldExpand }));
    setExpandedDepthByPostId((prev) => ({
      ...prev,
      [postId]: shouldExpand ? Math.max(prev[postId] ?? 0, 3) : 0,
    }));
    setShowAllImmediateRepliesByPostId((prev) => ({
      ...prev,
      [postId]: shouldExpand ? false : false,
    }));
  };

  const showMoreReplies = (postId: number) => {
    setShowAllImmediateRepliesByPostId((prev) => ({ ...prev, [postId]: true }));
  };

  const toggleReplyBox = (postId: number) => {
    setReplyOpenByPostId((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const renderPost = (post: DiscussionPost, depth = 0, inheritedDepth = 0) => {
    const isAuthor = user?.id === post.author.id;
    const isEditing = editingPostId === post.id;
    const isRoot = post.parentPostId === null;
    const isCollapsed = collapsedReplyIds[post.id] ?? false;
    const localDepth = isCollapsed ? 0 : Math.max(inheritedDepth, expandedDepthByPostId[post.id] ?? 0);
    const canToggleReplies = post.replies.length > 0;
    const showAllImmediate = showAllImmediateRepliesByPostId[post.id] ?? false;
    const showMore = canToggleReplies && localDepth > 0 && !showAllImmediate && post.replies.length > 3;
    const immediateReplies = showAllImmediate ? post.replies : post.replies.slice(0, 3);
    const canShowMoreButton = showMore && depth === 0;

    return (
      <article
        key={post.id}
        className="card stack"
        style={{ padding: 20, marginLeft: depth * 16 }}
        onMouseEnter={() => setHoveredPostId(post.id)}
        onMouseLeave={() => setHoveredPostId((prev) => (prev === post.id ? null : prev))}
      >
        <div className="stack" style={{ gap: 6 }}>
          {isEditing ? (
            <>
              {isRoot ? (
                <>
                  <label htmlFor={`edit-title-${post.id}`}>Title</label>
                  <input
                    id={`edit-title-${post.id}`}
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    disabled={savingPostId === post.id}
                  />
                </>
              ) : null}
              <label htmlFor={`edit-body-${post.id}`}>{isRoot ? "Post" : "Reply"}</label>
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
              {isRoot ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <strong>{post.title}</strong>
                  {canToggleReplies ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => toggleReplies(post.id, localDepth === 0)}
                      >
                        {localDepth === 0 ? `Show replies (${post.replies.length})` : "Hide replies"}
                      </button>
                      {canShowMoreButton ? (
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => showMoreReplies(post.id)}
                        >
                          Show more
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  {post.author.firstName} {post.author.lastName}
                  {isAuthor ? " (You)" : ""}
                  {post.author.role === "STAFF" ? `${isAuthor ? "," : ""} Staff` : ""}
                  {" - "}
                  {new Date(post.createdAt).toLocaleString()}
                </p>
                {!isRoot && canToggleReplies ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => toggleReplies(post.id, localDepth === 0)}
                    >
                      {localDepth === 0 ? `Show replies (${post.replies.length})` : "Hide replies"}
                    </button>
                  </div>
                ) : null}
              </div>
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
              <div style={{ display: hoveredPostId === post.id ? "flex" : "none", gap: 12 }}>
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
              </div>
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
                    onClick={() => handleUpdate(post)}
                    disabled={
                      savingPostId === post.id ||
                      (isRoot && editingTitle.trim().length === 0) ||
                      editingBody.trim().length === 0
                    }
                  >
                    Save
                  </button>
                </>
              ) : (
                <div style={{ display: hoveredPostId === post.id ? "flex" : "none", gap: 12 }}>
                  <button type="button" className="btn btn--ghost" onClick={() => startEditing(post)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingPostId === post.id}
                  >
                    {deletingPostId === post.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              )
            ) : null}

            {!isStudent && isStaff && post.author.role === "STUDENT" ? (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => handleReport(post.id)}
                disabled={reportingPostId === post.id}
                style={{ display: hoveredPostId === post.id ? "inline-flex" : "none" }}
              >
                {reportingPostId === post.id ? "Reporting..." : "Report"}
              </button>
            ) : null}
            {isStudent && !isAuthor && post.myStudentReportStatus !== "PENDING" ? (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => handleStudentReport(post.id)}
                disabled={reportingPostId === post.id}
                style={{ display: hoveredPostId === post.id ? "inline-flex" : "none" }}
              >
                {reportingPostId === post.id ? "Reporting..." : "Report"}
              </button>
            ) : null}
            {isStudent && !isAuthor && post.myStudentReportStatus === "PENDING" ? (
              <span className="muted" style={{ fontSize: 13 }}>
                Reported
              </span>
            ) : null}
          </div>
        </div>

        <div className="stack" style={{ gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => toggleReplyBox(post.id)}
            style={{
              display: hoveredPostId === post.id ? "inline-flex" : "none",
            }}
          >
            {replyOpenByPostId[post.id] ? "Cancel reply" : "Reply"}
          </button>
          {replyOpenByPostId[post.id] ? (
            <>
              <label htmlFor={`reply-${post.id}`}>Reply</label>
              <textarea
                id={`reply-${post.id}`}
                rows={3}
                value={replyDrafts[post.id] ?? ""}
                onChange={(event) => handleReplyChange(post.id, event.target.value)}
                placeholder="Write a reply"
                disabled={!user || userLoading || savingReplyPostId === post.id}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => handleReplySubmit(post.id)}
                  disabled={
                    !user ||
                    userLoading ||
                    savingReplyPostId === post.id ||
                    (replyDrafts[post.id] ?? "").trim().length === 0
                  }
                >
                  {savingReplyPostId === post.id ? "Replyingâ€¦" : "Post reply"}
                </button>
              </div>
            </>
          ) : null}
        </div>

        {post.replies.length && localDepth > 0 ? (
          <div className="stack">
            {immediateReplies.map((child) => renderPost(child, depth + 1, localDepth - 1))}
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <div className="stack stack--tabbed">
      {showProjectNav ? <ProjectNav projectId={projectId} /> : null}
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
            posts.map((post) => renderPost(post))
          )}
        </section>
      </section>
    </div>
  );
}
