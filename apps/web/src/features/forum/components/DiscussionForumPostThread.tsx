import { Ellipsis, ThumbsDown, ThumbsUp } from "lucide-react";
import { RichTextEditor } from "@/shared/ui/RichTextEditor";
import { RichTextViewer } from "@/shared/ui/RichTextViewer";
import type { Member } from "@/shared/ui/MentionPlugin";
import type { DiscussionPost } from "@/features/forum/types";
import { getAuthorRoleMeta } from "./DiscussionForumClient.tree";

export type ReportConfirmationState = { postId: number; mode: "staff" | "student" } | null;

type DiscussionForumUser = { id: number; role: string } | null;

type DiscussionForumPostThreadProps = {
  post: DiscussionPost;
  depth?: number;
  user: DiscussionForumUser;
  userLoading: boolean;
  isStaff: boolean;
  isStudent: boolean;
  members?: Member[];
  editingPostId: number | null;
  editingTitle: string;
  editingBody: string;
  editingBodyEmpty: boolean;
  savingPostId: number | null;
  savingReplyPostId: number | null;
  deletingPostId: number | null;
  reportingPostId: number | null;
  reactingPostId: number | null;
  replyDrafts: Record<number, string>;
  replyOpenByPostId: Record<number, boolean>;
  replyEmptyByPostId: Record<number, boolean>;
  replyKeyByPostId: Record<number, number>;
  expandedRepliesByPostId: Record<number, boolean>;
  showAllImmediateRepliesByPostId: Record<number, boolean>;
  menuOpenPostId: number | null;
  setEditingTitle: (value: string) => void;
  setEditingBody: (value: string) => void;
  setEditingBodyEmpty: (value: boolean) => void;
  setReplyEmptyByPostId: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  startEditing: (post: DiscussionPost) => void;
  cancelEditing: () => void;
  handleUpdate: (post: DiscussionPost) => Promise<void>;
  handleDelete: (postId: number) => Promise<void>;
  handleReaction: (postId: number, type: "LIKE" | "DISLIKE") => Promise<void>;
  handleReplyChange: (postId: number, value: string) => void;
  handleReplySubmit: (parentPostId: number) => Promise<void>;
  toggleReplies: (post: DiscussionPost, shouldExpand: boolean) => void;
  showMoreReplies: (postId: number) => void;
  toggleReplyBox: (postId: number) => void;
  togglePostMenu: (postId: number) => void;
  closePostMenu: () => void;
  setReportConfirmation: (state: ReportConfirmationState) => void;
};

export function DiscussionForumPostThread({
  post,
  depth = 0,
  user,
  userLoading,
  isStaff,
  isStudent,
  members,
  editingPostId,
  editingTitle,
  editingBody,
  editingBodyEmpty,
  savingPostId,
  savingReplyPostId,
  deletingPostId,
  reportingPostId,
  reactingPostId,
  replyDrafts,
  replyOpenByPostId,
  replyEmptyByPostId,
  replyKeyByPostId,
  expandedRepliesByPostId,
  showAllImmediateRepliesByPostId,
  menuOpenPostId,
  setEditingTitle,
  setEditingBody,
  setEditingBodyEmpty,
  setReplyEmptyByPostId,
  startEditing,
  cancelEditing,
  handleUpdate,
  handleDelete,
  handleReaction,
  handleReplyChange,
  handleReplySubmit,
  toggleReplies,
  showMoreReplies,
  toggleReplyBox,
  togglePostMenu,
  closePostMenu,
  setReportConfirmation,
}: DiscussionForumPostThreadProps) {
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
        <Ellipsis size={15} aria-hidden="true" />
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
              <button type="button" className="btn btn--ghost" onClick={cancelEditing} disabled={savingPostId === post.id}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void handleUpdate(post)}
                disabled={savingPostId === post.id || (isRoot && editingTitle.trim().length === 0) || editingBodyEmpty}
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
                    <button type="button" className="btn btn--ghost" onClick={() => showMoreReplies(post.id)}>
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
              <ThumbsUp size={14} className="discussion-post__vote-icon" aria-hidden="true" />
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
              <ThumbsDown size={14} className="discussion-post__vote-icon" aria-hidden="true" />
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
              onClick={() => void handleReplySubmit(post.id)}
              disabled={!user || userLoading || savingReplyPostId === post.id || replyEmptyByPostId[post.id] !== false}
            >
              {savingReplyPostId === post.id ? "Replying..." : "Post reply"}
            </button>
          </div>
        </div>
      ) : null}

      {post.replies.length > 0 && areRepliesExpanded ? (
        <div className="stack discussion-post__replies">
          {immediateReplies.map((child) => (
            <DiscussionForumPostThread
              key={child.id}
              post={child}
              depth={depth + 1}
              user={user}
              userLoading={userLoading}
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
          ))}
        </div>
      ) : null}
    </article>
  );
}
