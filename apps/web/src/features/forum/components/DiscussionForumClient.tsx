"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@/features/auth/useUser";
import { logDevError } from "@/shared/lib/devLogger";
import { RichTextEditor } from "@/shared/ui/RichTextEditor";
import type { Member } from "@/shared/ui/MentionPlugin";
import { RichTextViewer } from "@/shared/ui/RichTextViewer";
import { ConfirmationModal } from "@/shared/ui/ConfirmationModal";
import { DiscussionPostsSkeleton } from "@/shared/ui/LoadingSkeletonBlocks";
import { PaginationControls, PaginationPageIndicator } from "@/shared/ui/PaginationControls";
import {
  createDiscussionPost,
  createStudentForumReport,
  deleteDiscussionPost,
  getDiscussionPosts,
  reportDiscussionPost,
  reactToDiscussionPost,
  updateDiscussionPost,
} from "@/features/forum/api/client";
import { ApiError } from "@/shared/api/errors";
import type { DiscussionPost } from "@/features/forum/types";
import "../styles/discussion-forum.css";

type DiscussionForumClientProps = {
  projectId: string;
  showHeader?: boolean;
  members?: Member[];
};
type ReportConfirmationState = { postId: number; mode: "staff" | "student" } | null;

const ROOT_POSTS_PER_PAGE = 8;
const VOTE_ICON_PATH =
  "M6.25 6.5h6.5a1 1 0 0 1 .98 1.2l-.9 4.5a1 1 0 0 1-.98.8H6.25V6.5Zm-1 0H3.5A1.5 1.5 0 0 0 2 8v3.5A1.5 1.5 0 0 0 3.5 13h1.75V6.5Zm1-1V4a2.5 2.5 0 0 1 2.5-2.5c.55 0 1 .45 1 1v1.2c0 .38-.08.75-.23 1.1l-.3.7H6.25Z";
type ResolvedForumRole = NonNullable<DiscussionPost["author"]["forumRole"]>;

const AUTHOR_ROLE_META: Record<ResolvedForumRole, { label: string; variant: string }> = {
  STUDENT: { label: "Student", variant: "student" },
  MODULE_LEAD: { label: "Module Lead", variant: "module-lead" },
  TEACHING_ASSISTANT: { label: "Teaching Assistant", variant: "teaching-assistant" },
  STAFF: { label: "Staff", variant: "staff" },
  ADMIN: { label: "Admin", variant: "admin" },
  ENTERPRISE_ADMIN: { label: "Enterprise Admin", variant: "enterprise-admin" },
};

function getAuthorRoleMeta(author: DiscussionPost["author"]) {
  const resolvedRole: ResolvedForumRole = author.forumRole ?? author.role;
  return AUTHOR_ROLE_META[resolvedRole];
}

function compareRepliesByScore(a: DiscussionPost, b: DiscussionPost) {
  const aIsNonStudent = a.author.role !== "STUDENT";
  const bIsNonStudent = b.author.role !== "STUDENT";
  if (aIsNonStudent !== bIsNonStudent) {
    return aIsNonStudent ? -1 : 1;
  }
  if (b.reactionScore !== a.reactionScore) {
    return b.reactionScore - a.reactionScore;
  }
  const createdDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (createdDiff !== 0) return createdDiff;
  return a.id - b.id;
}

function normalizeReplyOrder(post: DiscussionPost): DiscussionPost {
  if (post.replies.length === 0) return post;
  return {
    ...post,
    replies: post.replies.map(normalizeReplyOrder).sort(compareRepliesByScore),
  };
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

export function DiscussionForumClient({ projectId, showHeader = true, members }: DiscussionForumClientProps) {
  const { user, loading: userLoading } = useUser();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const postsRef = useRef<DiscussionPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");
  const [savingPostId, setSavingPostId] = useState<number | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [reportingPostId, setReportingPostId] = useState<number | null>(null);
  const [reportConfirmation, setReportConfirmation] = useState<ReportConfirmationState>(null);
  const [reactingPostId, setReactingPostId] = useState<number | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [savingReplyPostId, setSavingReplyPostId] = useState<number | null>(null);
  const [expandedRepliesByPostId, setExpandedRepliesByPostId] = useState<Record<number, boolean>>({});
  const [showAllImmediateRepliesByPostId, setShowAllImmediateRepliesByPostId] = useState<Record<number, boolean>>({});
  const [replyOpenByPostId, setReplyOpenByPostId] = useState<Record<number, boolean>>({});
  const [menuOpenPostId, setMenuOpenPostId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [composerKey, setComposerKey] = useState(0);
  const [bodyEmpty, setBodyEmpty] = useState(true);
  const [editingBodyEmpty, setEditingBodyEmpty] = useState(true);
  const [replyEmptyByPostId, setReplyEmptyByPostId] = useState<Record<number, boolean>>({});
  const [replyKeyByPostId, setReplyKeyByPostId] = useState<Record<number, number>>({});

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

  const canSubmit = title.trim().length > 0 && !bodyEmpty;
  const totalPages = Math.max(1, Math.ceil(posts.length / ROOT_POSTS_PER_PAGE));
  const pageStart = (currentPage - 1) * ROOT_POSTS_PER_PAGE;
  const visiblePosts = posts.slice(pageStart, pageStart + ROOT_POSTS_PER_PAGE);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    if (userLoading) {
      setLoadingPosts(true);
      return;
    }
    if (!user) {
      setLoadingPosts(false);
      setPosts([]);
      postsRef.current = [];
      return;
    }

    setLoadingPosts(true);
    setError(null);
    setCurrentPage(1);
    getDiscussionPosts(user.id, Number(projectId))
      .then((fetchedPosts) => {
        const normalized = fetchedPosts.map(normalizeReplyOrder);
        postsRef.current = normalized;
        setPosts(normalized);
      })
      .catch((err: unknown) => {
        logDevError(err);
        setError("Failed to load discussion posts.");
      })
      .finally(() => setLoadingPosts(false));
  }, [user, userLoading, projectId]);

  const addReplyToTree = (items: DiscussionPost[], parentPostId: number, reply: DiscussionPost): DiscussionPost[] =>
    items.map((post) => {
      if (post.id === parentPostId) {
        return { ...post, replies: [...post.replies, normalizeReplyOrder(reply)].sort(compareRepliesByScore) };
      }
      if (post.replies.length === 0) return post;
      return { ...post, replies: addReplyToTree(post.replies, parentPostId, reply).sort(compareRepliesByScore) };
    });

  const findPostPath = (
    items: DiscussionPost[],
    postId: number,
    trail: number[] = []
  ): number[] | null => {
    for (const post of items) {
      const nextTrail = [...trail, post.id];
      if (post.id === postId) {
        return nextTrail;
      }
      if (post.replies.length === 0) continue;
      const nestedMatch = findPostPath(post.replies, postId, nextTrail);
      if (nestedMatch) {
        return nestedMatch;
      }
    }
    return null;
  };

  const updatePostInTree = (items: DiscussionPost[], updated: DiscussionPost): DiscussionPost[] =>
    items.map((post) => {
      if (post.id === updated.id) {
        return normalizeReplyOrder(updated);
      }
      if (post.replies.length === 0) return post;
      return { ...post, replies: updatePostInTree(post.replies, updated).sort(compareRepliesByScore) };
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

  const setPostsWithRef = (updater: (prev: DiscussionPost[]) => DiscussionPost[]) => {
    setPosts((prev) => {
      const next = updater(prev);
      postsRef.current = next;
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !user) return;

    try {
      const next = await createDiscussionPost(user.id, Number(projectId), {
        title: title.trim(),
        body,
      });
      setPostsWithRef((prev) => [next, ...prev]);
      setCurrentPage(1);
      setTitle("");
      setBody("");
      setBodyEmpty(true);
      setComposerKey((prev) => prev + 1);
    } catch (err) {
      logDevError(err);
      setError("Failed to create post.");
    }
  };

  const startEditing = (post: DiscussionPost) => {
    setMenuOpenPostId(null);
    setEditingPostId(post.id);
    setEditingTitle(post.title);
    setEditingBody(post.body);
    setEditingBodyEmpty(false);
  };

  const cancelEditing = () => {
    setMenuOpenPostId(null);
    setEditingPostId(null);
    setEditingTitle("");
    setEditingBody("");
    setEditingBodyEmpty(true);
  };

  const handleUpdate = async (post: DiscussionPost) => {
    if (!user) return;
    const trimmedTitle = post.parentPostId === null ? editingTitle.trim() : post.title;
    if ((post.parentPostId === null && !trimmedTitle) || editingBodyEmpty) return;

    setSavingPostId(post.id);
    try {
      const updated = await updateDiscussionPost(user.id, Number(projectId), post.id, {
        title: trimmedTitle,
        body: editingBody,
      });
      setPostsWithRef((prev) => updatePostInTree(prev, updated));
      cancelEditing();
    } catch (err) {
      logDevError(err);
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
      setPostsWithRef((prev) => removePostFromTree(prev, postId));
      if (editingPostId === postId) cancelEditing();
    } catch (err) {
      logDevError(err);
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
      setPostsWithRef((prev) => removePostFromTree(prev, postId));
    } catch (err) {
      logDevError(err);
      setError("Failed to report post.");
    } finally {
      setReportingPostId(null);
    }
  };

  const handleStudentReport = async (postId: number) => {
    if (!user) return;
    setReportingPostId(postId);
    try {
      await createStudentForumReport(user.id, Number(projectId), postId);
      setPostsWithRef((prev) => updateReportStatusInTree(prev, postId, "PENDING"));
    } catch (err) {
      logDevError(err);
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
      setPostsWithRef((prev) => updatePostInTree(prev, updated));
    } catch (err) {
      logDevError(err);
      if (err instanceof ApiError && err.status === 403) {
        return;
      }
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
    if (replyEmptyByPostId[parentPostId] !== false) return;

    setSavingReplyPostId(parentPostId);
    try {
      const reply = await createDiscussionPost(user.id, Number(projectId), {
        title: "",
        body: replyDrafts[parentPostId] ?? "",
        parentPostId,
      });
      const parentPath = findPostPath(postsRef.current, parentPostId) ?? [parentPostId];
      setPostsWithRef((prev) => addReplyToTree(prev, parentPostId, reply));
      setExpandedRepliesByPostId((prev) => {
        const next = { ...prev };
        for (const id of parentPath) {
          next[id] = true;
        }
        return next;
      });
      setShowAllImmediateRepliesByPostId((prev) => ({ ...prev, [parentPostId]: true }));
      setReplyDrafts((prev) => ({ ...prev, [parentPostId]: "" }));
      setReplyEmptyByPostId((prev) => ({ ...prev, [parentPostId]: true }));
      setReplyKeyByPostId((prev) => ({ ...prev, [parentPostId]: (prev[parentPostId] ?? 0) + 1 }));
      setReplyOpenByPostId((prev) => ({ ...prev, [parentPostId]: false }));
    } catch (err) {
      logDevError(err);
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

  const confirmReport = async () => {
    if (!reportConfirmation) return;
    const { postId, mode } = reportConfirmation;
    setReportConfirmation(null);
    if (mode === "staff") {
      await handleReport(postId);
      return;
    }
    await handleStudentReport(postId);
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
    const canReact = Boolean(user) && !userLoading && !isAuthor;
    const canManageOwnPost = isAuthor && !isEditing;
    const canReportAsStaff = !isStudent && isStaff && post.author.role === "STUDENT";
    const canReportAsStudent = isStudent && !isAuthor && post.myStudentReportStatus !== "PENDING";
    const canReportPost = canReportAsStaff || canReportAsStudent;
    const shouldShowMenu = !isEditing && (canReply || canManageOwnPost || canReportPost);
    const isMenuOpen = menuOpenPostId === post.id;
    const isDeletingPost = deletingPostId === post.id;
    const isReportingPost = reportingPostId === post.id;
    const authorName = `${post.author.firstName} ${post.author.lastName}${isAuthor ? " (You)" : ""}`;
    const authorRoleMeta = getAuthorRoleMeta(post.author);
    const rolePillClassName = `discussion-post__role-pill pill pill-ghost discussion-post__role-pill--${authorRoleMeta.variant}`;
    const createdAtLabel = new Date(post.createdAt).toLocaleString();
    const handleReportAction = () => {
      closePostMenu();
      if (canReportAsStaff) {
        setReportConfirmation({ postId: post.id, mode: "staff" });
        return;
      }
      if (canReportAsStudent) {
        setReportConfirmation({ postId: post.id, mode: "student" });
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
                <span>{isRoot ? "Post" : "Reply"}</span>
                <RichTextEditor
                  initialContent={editingBody}
                  onChange={setEditingBody}
                  onEmptyChange={setEditingBodyEmpty}
                  members={members}
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
                    editingBodyEmpty
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
                    <p className="discussion-post__meta">
                      <span>{authorName}</span>
                      <span className={rolePillClassName}>{authorRoleMeta.label}</span>
                      <span aria-hidden="true">-</span>
                      <span>{createdAtLabel}</span>
                    </p>
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
                  <p className="discussion-post__meta">
                    <span>{authorName}</span>
                    <span className={rolePillClassName}>{authorRoleMeta.label}</span>
                    <span aria-hidden="true">-</span>
                    <span>{createdAtLabel}</span>
                  </p>
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

        {isEditing ? null : (
          <div className="discussion-post__body">
            <RichTextViewer content={post.body} />
          </div>
        )}

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
                onClick={() => {
                  if (!canReact || reactingPostId === post.id) return;
                  void handleReaction(post.id, "LIKE");
                }}
                disabled={!canReact || reactingPostId === post.id}
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
                onClick={() => {
                  if (!canReact || reactingPostId === post.id) return;
                  void handleReaction(post.id, "DISLIKE");
                }}
                disabled={!canReact || reactingPostId === post.id}
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
              <span>Reply</span>
              <RichTextEditor
                key={replyKeyByPostId[post.id] ?? 0}
                initialContent={replyDrafts[post.id] ?? ""}
                onChange={(value) => handleReplyChange(post.id, value)}
                onEmptyChange={(empty) => setReplyEmptyByPostId((prev) => ({ ...prev, [post.id]: empty }))}
                placeholder="Write a reply"
                members={members}
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
                  replyEmptyByPostId[post.id] !== false
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
      {showHeader ? (
        <header className="projects-panel__header discussion-forum__header">
          <h1 className="projects-panel__title">Discussion Forum</h1>
          <p className="projects-panel__subtitle">Share updates, ask questions, and keep the team aligned.</p>
        </header>
      ) : null}

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
            <span>Post</span>
            <RichTextEditor
              key={composerKey}
              initialContent={body}
              onChange={setBody}
              onEmptyChange={setBodyEmpty}
              placeholder="Write your update or question"
              members={members}
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
        {userLoading || loadingPosts ? (
          <DiscussionPostsSkeleton />
        ) : posts.length === 0 ? (
          <div className="ui-empty-state">
            <p>No posts yet. Start the discussion above.</p>
          </div>
        ) : (
          <>
            {visiblePosts.map((post) => renderPost(post))}
            {totalPages > 1 ? (
              <PaginationControls
                as="nav"
                className="discussion-posts__pagination"
                ariaLabel="Discussion posts pagination"
                page={currentPage}
                totalPages={totalPages}
                onPreviousPage={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                onNextPage={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              >
                <PaginationPageIndicator page={currentPage} totalPages={totalPages} />
              </PaginationControls>
            ) : null}
          </>
        )}
      </section>
      <ConfirmationModal
        open={reportConfirmation !== null}
        title="Report post?"
        message={
          reportConfirmation?.mode === "staff"
            ? "Report this post to staff?"
            : "Report this post to project staff?"
        }
        cancelLabel="Cancel"
        confirmLabel="Report post"
        onCancel={() => setReportConfirmation(null)}
        onConfirm={() => void confirmReport()}
      />
    </div>
  );
}
