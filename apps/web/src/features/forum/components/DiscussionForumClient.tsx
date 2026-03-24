"use client";

import { useEffect, useState } from "react";
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
import "../styles/discussion-forum.css";

type DiscussionForumClientProps = {
  projectId: string;
};

const ROOT_POSTS_PER_PAGE = 8;
const VOTE_ICON_PATH =
  "M6.25 6.5h6.5a1 1 0 0 1 .98 1.2l-.9 4.5a1 1 0 0 1-.98.8H6.25V6.5Zm-1 0H3.5A1.5 1.5 0 0 0 2 8v3.5A1.5 1.5 0 0 0 3.5 13h1.75V6.5Zm1-1V4a2.5 2.5 0 0 1 2.5-2.5c.55 0 1 .45 1 1v1.2c0 .38-.08.75-.23 1.1l-.3.7H6.25Z";

function ensureTextareaMinHeight(textarea: HTMLTextAreaElement) {
  if (textarea.dataset.minHeightPx) {
    return Number(textarea.dataset.minHeightPx);
  }

  const minHeight = Math.ceil(textarea.getBoundingClientRect().height);
  textarea.dataset.minHeightPx = String(minHeight);
  textarea.style.minHeight = `${minHeight}px`;
  return minHeight;
}

function autoGrowTextarea(textarea: HTMLTextAreaElement) {
  const minHeight = ensureTextareaMinHeight(textarea);
  textarea.style.height = "auto";
  const nextHeight = Math.max(textarea.scrollHeight, minHeight);
  textarea.style.height = `${nextHeight}px`;
}

function registerAutoGrowingTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;
  ensureTextareaMinHeight(textarea);
  autoGrowTextarea(textarea);
}

function DiscussionVoteIcon({ direction = "up" }: { direction?: "up" | "down" }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        d={VOTE_ICON_PATH}
        fill="currentColor"
        transform={direction === "down" ? "rotate(180 8 8)" : undefined}
      />
    </svg>
  );
}

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
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [savingReplyPostId, setSavingReplyPostId] = useState<number | null>(null);
  const [expandedRepliesByPostId, setExpandedRepliesByPostId] = useState<Record<number, boolean>>({});
  const [showAllImmediateRepliesByPostId, setShowAllImmediateRepliesByPostId] = useState<Record<number, boolean>>({});
  const [replyOpenByPostId, setReplyOpenByPostId] = useState<Record<number, boolean>>({});
  const [menuOpenPostId, setMenuOpenPostId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (menuOpenPostId === null) return;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        setMenuOpenPostId(null);
        return;
      }
      if (!target.closest(".discussion-post__menu")) {
        setMenuOpenPostId(null);
      }
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }, [menuOpenPostId]);

  const isStaff =
    Boolean(user?.isStaff) ||
    Boolean(user?.isAdmin) ||
    Boolean(user?.isEnterpriseAdmin) ||
    user?.role === "STAFF" ||
    user?.role === "ADMIN" ||
    user?.role === "ENTERPRISE_ADMIN";
  const isStudent = user?.role === "STUDENT";

  const canSubmit = title.trim().length > 0 && body.trim().length > 0;
  const totalPages = Math.max(1, Math.ceil(posts.length / ROOT_POSTS_PER_PAGE));
  const pageStart = (currentPage - 1) * ROOT_POSTS_PER_PAGE;
  const visiblePosts = posts.slice(pageStart, pageStart + ROOT_POSTS_PER_PAGE);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!user) return;
    setLoadingPosts(true);
    setError(null);
    setCurrentPage(1);
    getDiscussionPosts(user.id, Number(projectId))
      .then(setPosts)
      .catch((err: unknown) => {
        console.error(err);
        setError("Failed to load discussion posts.");
      })
      .finally(() => setLoadingPosts(false));
  }, [user, projectId]);

  const addReplyToTree = (items: DiscussionPost[], parentPostId: number, reply: DiscussionPost): DiscussionPost[] =>
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
      setCurrentPage(1);
      setTitle("");
      setBody("");
    } catch (err) {
      console.error(err);
      setError("Failed to create post.");
    }
  };

  const startEditing = (post: DiscussionPost) => {
    setMenuOpenPostId(null);
    setEditingPostId(post.id);
    setEditingTitle(post.title);
    setEditingBody(post.body);
  };

  const cancelEditing = () => {
    setMenuOpenPostId(null);
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

  const collectDescendantIds = (post: DiscussionPost): number[] => {
    const descendants: number[] = [];
    const stack = [...post.replies];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      descendants.push(current.id);
      if (current.replies.length > 0) {
        stack.push(...current.replies);
      }
    }

    return descendants;
  };

  const toggleReplies = (post: DiscussionPost, shouldExpand: boolean) => {
    const descendantIds = shouldExpand ? [] : collectDescendantIds(post);

    setExpandedRepliesByPostId((prev) => {
      const next = { ...prev, [post.id]: shouldExpand };
      for (const descendantId of descendantIds) {
        next[descendantId] = false;
      }
      return next;
    });

    setShowAllImmediateRepliesByPostId((prev) => {
      const next = { ...prev, [post.id]: false };
      for (const descendantId of descendantIds) {
        next[descendantId] = false;
      }
      return next;
    });
  };

  const showMoreReplies = (postId: number) => {
    setShowAllImmediateRepliesByPostId((prev) => ({ ...prev, [postId]: true }));
  };

  const toggleReplyBox = (postId: number) => {
    setReplyOpenByPostId((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const togglePostMenu = (postId: number) => {
    setMenuOpenPostId((prev) => (prev === postId ? null : postId));
  };

  const closePostMenu = () => {
    setMenuOpenPostId(null);
  };

  const renderPost = (post: DiscussionPost, depth = 0) => {
    const isAuthor = user?.id === post.author.id;
    const isEditing = editingPostId === post.id;
    const isRoot = post.parentPostId === null;
    const areRepliesExpanded = expandedRepliesByPostId[post.id] ?? false;
    const canToggleReplies = post.replies.length > 0;
    const showAllImmediate = showAllImmediateRepliesByPostId[post.id] ?? false;
    const showMore = canToggleReplies && areRepliesExpanded && !showAllImmediate && post.replies.length > 3;
    const immediateReplies = showAllImmediate ? post.replies : post.replies.slice(0, 3);
    const canShowMoreButton = showMore && depth === 0;
    const canReply = Boolean(user) && !userLoading;
    const canManageOwnPost = isAuthor && !isEditing;
    const canReportAsStaff = !isStudent && isStaff && post.author.role === "STUDENT";
    const canReportAsStudent = isStudent && !isAuthor && post.myStudentReportStatus !== "PENDING";
    const canReportPost = canReportAsStaff || canReportAsStudent;
    const shouldShowMenu = !isEditing && (canReply || canManageOwnPost || canReportPost);
    const isMenuOpen = menuOpenPostId === post.id;
    const isDeletingPost = deletingPostId === post.id;
    const isReportingPost = reportingPostId === post.id;
    const authorLine = `${post.author.firstName} ${post.author.lastName}${isAuthor ? " (You)" : ""}${
      post.author.role === "STAFF" ? `${isAuthor ? "," : ""} Staff` : ""
    } - ${new Date(post.createdAt).toLocaleString()}`;
    const handleReportAction = () => {
      closePostMenu();
      if (canReportAsStaff) {
        void handleReport(post.id);
        return;
      }
      if (canReportAsStudent) {
        void handleStudentReport(post.id);
      }
    };

    const postMenu = shouldShowMenu ? (
      <div className="discussion-post__menu">
        <button
          type="button"
          className="btn btn--ghost btn--sm discussion-post__menu-trigger"
          aria-label="Post actions"
          aria-expanded={isMenuOpen}
          onClick={() => togglePostMenu(post.id)}
        >
          •••
        </button>
        {isMenuOpen ? (
          <div className="discussion-post__menu-panel" data-elevation="popup">
            {canReply ? (
              <button
                type="button"
                className="discussion-post__menu-item"
                onClick={() => {
                  toggleReplyBox(post.id);
                  closePostMenu();
                }}
              >
                {replyOpenByPostId[post.id] ? "Cancel reply" : "Reply"}
              </button>
            ) : null}
            {canManageOwnPost ? (
              <button
                type="button"
                className="discussion-post__menu-item"
                onClick={() => {
                  startEditing(post);
                  closePostMenu();
                }}
              >
                Edit
              </button>
            ) : null}
            {canManageOwnPost ? (
              <button
                type="button"
                className="discussion-post__menu-item discussion-post__menu-item--danger"
                disabled={isDeletingPost}
                onClick={() => {
                  if (isDeletingPost) return;
                  closePostMenu();
                  void handleDelete(post.id);
                }}
              >
                {isDeletingPost ? "Deleting..." : "Delete"}
              </button>
            ) : null}
            {canReportPost ? (
              <button
                type="button"
                className="discussion-post__menu-item"
                disabled={isReportingPost}
                onClick={() => {
                  if (isReportingPost) return;
                  handleReportAction();
                }}
              >
                {isReportingPost ? "Reporting..." : "Report"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    ) : null;

    return (
      <article
        key={post.id}
        className={`card discussion-post ${isRoot ? "discussion-post--root" : "discussion-post--reply"}${
          isMenuOpen ? " discussion-post--menu-open" : ""
        }`}
      >
        <div className="discussion-post__header">
          {isEditing ? (
            <>
              {isRoot ? (
                <div className="discussion-field">
                  <label htmlFor={`edit-title-${post.id}`}>Title</label>
                  <input
                    id={`edit-title-${post.id}`}
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    disabled={savingPostId === post.id}
                  />
                </div>
              ) : null}
              <div className="discussion-field">
                <label htmlFor={`edit-body-${post.id}`}>{isRoot ? "Post" : "Reply"}</label>
                <textarea
                  ref={registerAutoGrowingTextarea}
                  id={`edit-body-${post.id}`}
                  rows={4}
                  value={editingBody}
                  onChange={(event) => setEditingBody(event.target.value)}
                  onInput={(event) => autoGrowTextarea(event.currentTarget)}
                  disabled={savingPostId === post.id}
                />
              </div>
              <div className="discussion-post__action-row">
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
              </div>
            </>
          ) : (
            <>
              {isRoot ? (
                <div className="discussion-post__title-row">
                  <div className="discussion-post__headline">
                    <strong className="discussion-post__title">{post.title}</strong>
                    <p className="discussion-post__meta">{authorLine}</p>
                    {post.updatedAt !== post.createdAt ? (
                      <p className="discussion-post__edited">Edited: {new Date(post.updatedAt).toLocaleString()}</p>
                    ) : null}
                  </div>
                  <div className="discussion-post__title-actions">
                    {canToggleReplies ? (
                      <button
                        type="button"
                        className="btn btn--ghost discussion-post__toggle-replies"
                        onClick={() => toggleReplies(post, !areRepliesExpanded)}
                      >
                        {areRepliesExpanded ? "Hide replies" : `Show replies (${post.replies.length})`}
                      </button>
                    ) : null}
                    {canShowMoreButton ? (
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => showMoreReplies(post.id)}
                      >
                        Show more
                      </button>
                    ) : null}
                    {postMenu}
                  </div>
                </div>
              ) : null}

              {!isRoot ? (
                <div className="discussion-post__meta-row">
                  <p className="discussion-post__meta">{authorLine}</p>
                  <div className="discussion-post__meta-actions">
                    {canToggleReplies ? (
                      <button
                        type="button"
                        className="btn btn--ghost discussion-post__toggle-replies"
                        onClick={() => toggleReplies(post, !areRepliesExpanded)}
                      >
                        {areRepliesExpanded ? "Hide replies" : `Show replies (${post.replies.length})`}
                      </button>
                    ) : null}
                    {postMenu}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        {isEditing ? null : <p className="discussion-post__body">{post.body}</p>}

        <div className="discussion-post__toolbar">
          <div className="discussion-post__toolbar-left">
            <span className="muted discussion-post__score" aria-label={`Votes ${post.reactionScore}`}>
              <svg
                className="discussion-post__score-icon"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M8 2.5 13 8h-3v5.5H6V8H3L8 2.5Z" fill="currentColor" />
              </svg>
              <span>{post.reactionScore}</span>
            </span>
            <div className="discussion-post__action-row">
              <button
                type="button"
                className={`discussion-post__vote-btn discussion-post__vote-btn--like${
                  post.myReaction === "LIKE" ? " is-active" : ""
                }`}
                onClick={() => handleReaction(post.id, "LIKE")}
                disabled={reactingPostId === post.id}
                aria-label={post.myReaction === "LIKE" ? "Remove like" : "Like post"}
                title={post.myReaction === "LIKE" ? "Liked" : "Like"}
              >
                <DiscussionVoteIcon />
              </button>
              <button
                type="button"
                className={`discussion-post__vote-btn discussion-post__vote-btn--dislike${
                  post.myReaction === "DISLIKE" ? " is-active" : ""
                }`}
                onClick={() => handleReaction(post.id, "DISLIKE")}
                disabled={reactingPostId === post.id}
                aria-label={post.myReaction === "DISLIKE" ? "Remove dislike" : "Dislike post"}
                title={post.myReaction === "DISLIKE" ? "Disliked" : "Dislike"}
              >
                <DiscussionVoteIcon direction="down" />
              </button>
            </div>
            {isStudent && !isAuthor && post.myStudentReportStatus === "PENDING" ? (
              <span className="muted discussion-post__reported-tag">Reported</span>
            ) : null}
          </div>
        </div>

        {replyOpenByPostId[post.id] ? (
          <div className="discussion-post__reply-editor">
            <div className="discussion-field">
              <label htmlFor={`reply-${post.id}`}>Reply</label>
              <textarea
                ref={registerAutoGrowingTextarea}
                id={`reply-${post.id}`}
                rows={3}
                value={replyDrafts[post.id] ?? ""}
                onChange={(event) => handleReplyChange(post.id, event.target.value)}
                onInput={(event) => autoGrowTextarea(event.currentTarget)}
                placeholder="Write a reply"
                disabled={!user || userLoading || savingReplyPostId === post.id}
              />
            </div>
            <div className="discussion-post__reply-editor-actions">
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
                {savingReplyPostId === post.id ? "Replying..." : "Post reply"}
              </button>
            </div>
          </div>
        ) : null}

        {post.replies.length > 0 && areRepliesExpanded ? (
          <div className="stack discussion-post__replies">
            {immediateReplies.map((child) => renderPost(child, depth + 1))}
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <div className="discussion-forum stack projects-panel">
      <header className="projects-panel__header discussion-forum__header">
        <h1 className="projects-panel__title">Discussion Forum</h1>
        <p className="projects-panel__subtitle">Share updates, ask questions, and keep the team aligned.</p>
      </header>

      <form className="card discussion-composer" onSubmit={handleSubmit}>
        <div className="discussion-composer__body">
          <div className="discussion-field">
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

          <div className="discussion-field">
            <label htmlFor="discussion-body">Post</label>
            <textarea
              ref={registerAutoGrowingTextarea}
              id="discussion-body"
              name="body"
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onInput={(event) => autoGrowTextarea(event.currentTarget)}
              placeholder="Write your update or question"
              disabled={!user || userLoading}
            />
          </div>

          <div className="discussion-composer__actions">
            <button type="submit" className="btn btn--primary btn--sm" disabled={!canSubmit || !user || userLoading}>
              Post
            </button>
          </div>

          {!user && !userLoading ? <p className="ui-note ui-note--muted">Please sign in to create a post.</p> : null}
        </div>
      </form>

      <section className="stack discussion-posts" aria-label="Posts">
        <h2 className="discussion-posts__title">Latest posts</h2>
        {error ? <p className="ui-note ui-note--error">{error}</p> : null}
        {loadingPosts ? (
          <p className="ui-note ui-note--muted">Loading posts...</p>
        ) : posts.length === 0 ? (
          <div className="ui-empty-state">
            <p>No posts yet. Start the discussion above.</p>
          </div>
        ) : (
          <>
            {visiblePosts.map((post) => renderPost(post))}
            {totalPages > 1 ? (
              <nav className="discussion-posts__pagination" aria-label="Discussion posts pagination">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <p className="discussion-posts__page-indicator" aria-live="polite">
                  Page {currentPage} of {totalPages}
                </p>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </nav>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}