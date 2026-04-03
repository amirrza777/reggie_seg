"use client";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@/features/auth/useUser";
import { logDevError } from "@/shared/lib/devLogger";
import type { Member } from "@/shared/ui/MentionPlugin";
import { ConfirmationModal } from "@/shared/ui/ConfirmationModal";
import {
  createDiscussionPost,
  createStudentForumReport,
  deleteDiscussionPost,
  getDiscussionPosts,
  reactToDiscussionPost,
  reportDiscussionPost,
  updateDiscussionPost,
} from "@/features/forum/api/client";
import { ApiError } from "@/shared/api/errors";
import type { DiscussionPost } from "@/features/forum/types";
import {
  addReplyToTree,
  collectDescendantIds,
  findPostPath,
  normalizeReplyOrder,
  removePostFromTree,
  updatePostInTree,
  updateReportStatusInTree,
} from "./DiscussionForumClient.tree";
import type { ReportConfirmationState } from "./DiscussionForumPostThread";
import { DiscussionForumComposer } from "./DiscussionForumComposer";
import { DiscussionForumPostListPanel } from "./DiscussionForumPostListPanel";
import "../styles/discussion-forum.css";
type DiscussionForumClientProps = {
  projectId: string;
  showHeader?: boolean;
  members?: Member[];
};
const ROOT_POSTS_PER_PAGE = 8;
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
  return (
    <div className="discussion-forum stack projects-panel">
      {showHeader ? (
        <header className="projects-panel__header discussion-forum__header">
          <h1 className="projects-panel__title">Discussion Forum</h1>
          <p className="projects-panel__subtitle">Share updates, ask questions, and keep the team aligned.</p>
        </header>
      ) : null}
      <DiscussionForumComposer
        onSubmit={handleSubmit}
        title={title}
        setTitle={setTitle}
        body={body}
        setBody={setBody}
        setBodyEmpty={setBodyEmpty}
        userLoading={userLoading}
        isSignedIn={Boolean(user)}
        canSubmit={canSubmit}
        composerKey={composerKey}
        members={members}
      />
      <DiscussionForumPostListPanel
        error={error}
        userLoading={userLoading}
        loadingPosts={loadingPosts}
        posts={posts}
        visiblePosts={visiblePosts}
        currentPage={currentPage}
        totalPages={totalPages}
        onPreviousPage={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
        onNextPage={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
        user={user ? { id: user.id, role: user.role } : null}
        isStaff={isStaff}
        isStudent={isStudent}
        members={members}
        editingPostId={editingPostId}
        editingTitle={editingTitle}
        editingBody={editingBody}
        editingBodyEmpty={editingBodyEmpty}
        savingPostId={savingPostId}
        savingReplyPostId={savingReplyPostId}
        deletingPostId={deletingPostId}
        reportingPostId={reportingPostId}
        reactingPostId={reactingPostId}
        replyDrafts={replyDrafts}
        replyOpenByPostId={replyOpenByPostId}
        replyEmptyByPostId={replyEmptyByPostId}
        replyKeyByPostId={replyKeyByPostId}
        expandedRepliesByPostId={expandedRepliesByPostId}
        showAllImmediateRepliesByPostId={showAllImmediateRepliesByPostId}
        menuOpenPostId={menuOpenPostId}
        setEditingTitle={setEditingTitle}
        setEditingBody={setEditingBody}
        setEditingBodyEmpty={setEditingBodyEmpty}
        setReplyEmptyByPostId={setReplyEmptyByPostId}
        startEditing={startEditing}
        cancelEditing={cancelEditing}
        handleUpdate={handleUpdate}
        handleDelete={handleDelete}
        handleReaction={handleReaction}
        handleReplyChange={handleReplyChange}
        handleReplySubmit={handleReplySubmit}
        toggleReplies={toggleReplies}
        showMoreReplies={showMoreReplies}
        toggleReplyBox={toggleReplyBox}
        togglePostMenu={togglePostMenu}
        closePostMenu={closePostMenu}
        setReportConfirmation={setReportConfirmation}
      />
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
