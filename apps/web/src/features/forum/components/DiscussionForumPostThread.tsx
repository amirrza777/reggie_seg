import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { ReactNode } from "react";
import { RichTextEditor } from "@/shared/ui/rich-text/RichTextEditor";
import { RichTextViewer } from "@/shared/ui/rich-text/RichTextViewer";
import { getAuthorRoleMeta } from "./DiscussionForumClient.tree";
import { DiscussionForumPostThreadMenu } from "./DiscussionForumPostThread.menu";
import type { DiscussionForumPostThreadProps } from "./DiscussionForumPostThread.types";

export type { ReportConfirmationState } from "./DiscussionForumPostThread.types";

type ThreadState = {
  depth: number;
  isAuthor: boolean;
  isEditing: boolean;
  isRoot: boolean;
  areRepliesExpanded: boolean;
  canToggleReplies: boolean;
  immediateReplies: DiscussionForumPostThreadProps["post"]["replies"];
  canShowMoreButton: boolean;
  canReply: boolean;
  canReact: boolean;
  canManageOwnPost: boolean;
  canReportAsStaff: boolean;
  canReportAsStudent: boolean;
  canReportPost: boolean;
  shouldShowMenu: boolean;
  isMenuOpen: boolean;
  isDeletingPost: boolean;
  isReportingPost: boolean;
  authorName: string;
  authorRoleLabel: string;
  rolePillClassName: string;
  createdAtLabel: string;
  editedAtLabel: string | null;
};

function buildReplyState(props: DiscussionForumPostThreadProps, depth: number) {
  const post = props.post;
  const areRepliesExpanded = props.expandedRepliesByPostId[post.id] ?? false;
  const canToggleReplies = post.replies.length > 0;
  const showAllImmediate = props.showAllImmediateRepliesByPostId[post.id] ?? false;
  return {
    areRepliesExpanded,
    canToggleReplies,
    immediateReplies: showAllImmediate ? post.replies : post.replies.slice(0, 3),
    canShowMoreButton: canToggleReplies && areRepliesExpanded && !showAllImmediate && post.replies.length > 3 && depth === 0,
  };
}

function canReplyToPost(props: DiscussionForumPostThreadProps) {
  return Boolean(props.user) && !props.userLoading;
}

function canReactToPost(props: DiscussionForumPostThreadProps, isAuthor: boolean) {
  return Boolean(props.user) && !props.userLoading && !isAuthor;
}

function canStaffReportPost(props: DiscussionForumPostThreadProps) {
  return !props.isStudent && props.isStaff && props.post.author.role === "STUDENT";
}

function canStudentReportPost(props: DiscussionForumPostThreadProps, isAuthor: boolean) {
  return props.isStudent && !isAuthor && props.post.myStudentReportStatus !== "PENDING";
}

function shouldShowThreadMenu(isEditing: boolean, canReply: boolean, canManageOwnPost: boolean, canReportPost: boolean) {
  return !isEditing && (canReply || canManageOwnPost || canReportPost);
}

function buildPermissionState(props: DiscussionForumPostThreadProps, isAuthor: boolean, isEditing: boolean) {
  const canReply = canReplyToPost(props);
  const canManageOwnPost = isAuthor && !isEditing;
  const canReportAsStaff = canStaffReportPost(props);
  const canReportAsStudent = canStudentReportPost(props, isAuthor);
  const canReportPost = canReportAsStaff || canReportAsStudent;
  return {
    canReply,
    canReact: canReactToPost(props, isAuthor),
    canManageOwnPost,
    canReportAsStaff,
    canReportAsStudent,
    canReportPost,
    shouldShowMenu: shouldShowThreadMenu(isEditing, canReply, canManageOwnPost, canReportPost),
  };
}

function buildAuthorMetaState(props: DiscussionForumPostThreadProps, isAuthor: boolean) {
  const authorRoleMeta = getAuthorRoleMeta(props.post.author);
  return {
    authorName: `${props.post.author.firstName} ${props.post.author.lastName}${isAuthor ? " (You)" : ""}`,
    authorRoleLabel: authorRoleMeta.label,
    rolePillClassName: `discussion-post__role-pill pill pill-ghost discussion-post__role-pill--${authorRoleMeta.variant}`,
    createdAtLabel: new Date(props.post.createdAt).toLocaleString(),
    editedAtLabel: props.post.updatedAt !== props.post.createdAt ? new Date(props.post.updatedAt).toLocaleString() : null,
  };
}

function buildThreadState(props: DiscussionForumPostThreadProps, depth: number): ThreadState {
  const isAuthor = props.user?.id === props.post.author.id;
  const isEditing = props.editingPostId === props.post.id;
  const replyState = buildReplyState(props, depth);
  const permissionState = buildPermissionState(props, isAuthor, isEditing);
  const authorMetaState = buildAuthorMetaState(props, isAuthor);

  return {
    depth,
    isAuthor,
    isEditing,
    isRoot: props.post.parentPostId === null,
    ...replyState,
    ...permissionState,
    isMenuOpen: props.menuOpenPostId === props.post.id,
    isDeletingPost: props.deletingPostId === props.post.id,
    isReportingPost: props.reportingPostId === props.post.id,
    ...authorMetaState,
  };
}

function createReportHandler(props: DiscussionForumPostThreadProps, state: ThreadState) {
  return () => {
    props.closePostMenu();
    if (state.canReportAsStaff) {
      props.setReportConfirmation({ postId: props.post.id, mode: "staff" });
      return;
    }
    if (state.canReportAsStudent) {
      props.setReportConfirmation({ postId: props.post.id, mode: "student" });
    }
  };
}

function createToggleReplyHandler(props: DiscussionForumPostThreadProps) {
  return () => {
    props.toggleReplyBox(props.post.id);
    props.closePostMenu();
  };
}

function createEditHandler(props: DiscussionForumPostThreadProps) {
  return () => {
    props.startEditing(props.post);
    props.closePostMenu();
  };
}

function createDeleteHandler(props: DiscussionForumPostThreadProps, state: ThreadState) {
  return () => {
    if (!state.isDeletingPost) {
      props.closePostMenu();
      void props.handleDelete(props.post.id);
    }
  };
}

function createReportMenuHandler(state: ThreadState, onReport: () => void) {
  return () => {
    if (!state.isReportingPost) {
      onReport();
    }
  };
}

function createPostMenu(props: DiscussionForumPostThreadProps, state: ThreadState): ReactNode {
  if (!state.shouldShowMenu) {
    return null;
  }

  const onReport = createReportHandler(props, state);
  const onToggleReply = createToggleReplyHandler(props);
  const onEdit = createEditHandler(props);
  const onDelete = createDeleteHandler(props, state);
  const onReportMenu = createReportMenuHandler(state, onReport);

  return (
    <DiscussionForumPostThreadMenu
      isMenuOpen={state.isMenuOpen}
      canReply={state.canReply}
      canManageOwnPost={state.canManageOwnPost}
      canReportPost={state.canReportPost}
      isDeletingPost={state.isDeletingPost}
      isReportingPost={state.isReportingPost}
      isReplyOpen={props.replyOpenByPostId[props.post.id] ?? false}
      onToggleMenu={() => props.togglePostMenu(props.post.id)}
      onToggleReply={onToggleReply}
      onEdit={onEdit}
      onDelete={onDelete}
      onReport={onReportMenu}
    />
  );
}

function ThreadMeta({ state }: { state: ThreadState }) {
  return (
    <p className="discussion-post__meta">
      <span>{state.authorName}</span>
      <span className={state.rolePillClassName}>{state.authorRoleLabel}</span>
      <span aria-hidden="true">-</span>
      <span>{state.createdAtLabel}</span>
    </p>
  );
}

function ThreadActionButtons({ props, state, postMenu }: { props: DiscussionForumPostThreadProps; state: ThreadState; postMenu: ReactNode }) {
  return (
    <>
      {state.canToggleReplies ? (
        <button type="button" className="btn btn--ghost discussion-post__toggle-replies" onClick={() => props.toggleReplies(props.post, !state.areRepliesExpanded)}>
          {state.areRepliesExpanded ? "Hide replies" : `Show replies (${props.post.replies.length})`}
        </button>
      ) : null}
      {state.canShowMoreButton ? (
        <button type="button" className="btn btn--ghost" onClick={() => props.showMoreReplies(props.post.id)}>
          Show more
        </button>
      ) : null}
      {postMenu}
    </>
  );
}

function ThreadEditingHeader({ props, state }: { props: DiscussionForumPostThreadProps; state: ThreadState }) {
  return (
    <>
      {state.isRoot ? (
        <div className="discussion-field">
          <label htmlFor={`edit-title-${props.post.id}`}>Title</label>
          <input id={`edit-title-${props.post.id}`} value={props.editingTitle} onChange={(event) => props.setEditingTitle(event.target.value)} disabled={props.savingPostId === props.post.id} />
        </div>
      ) : null}
      <div className="discussion-field">
        <span>{state.isRoot ? "Post" : "Reply"}</span>
        <RichTextEditor initialContent={props.editingBody} onChange={props.setEditingBody} onEmptyChange={props.setEditingBodyEmpty} members={props.members} />
      </div>
      <div className="discussion-post__action-row">
        <button type="button" className="btn btn--ghost" onClick={props.cancelEditing} disabled={props.savingPostId === props.post.id}>Cancel</button>
        <button type="button" className="btn btn--primary" onClick={() => void props.handleUpdate(props.post)} disabled={props.savingPostId === props.post.id || (state.isRoot && props.editingTitle.trim().length === 0) || props.editingBodyEmpty}>Save</button>
      </div>
    </>
  );
}

function ThreadDisplayHeader({ props, state, postMenu }: { props: DiscussionForumPostThreadProps; state: ThreadState; postMenu: ReactNode }) {
  if (state.isRoot) {
    return (
      <div className="discussion-post__title-row">
        <div className="discussion-post__headline">
          <strong className="discussion-post__title">{props.post.title}</strong>
          <ThreadMeta state={state} />
          {state.editedAtLabel ? <p className="discussion-post__edited">Edited: {state.editedAtLabel}</p> : null}
        </div>
        <div className="discussion-post__title-actions">
          <ThreadActionButtons props={props} state={state} postMenu={postMenu} />
        </div>
      </div>
    );
  }

  return (
    <div className="discussion-post__meta-row">
      <ThreadMeta state={state} />
      <div className="discussion-post__meta-actions">
        <ThreadActionButtons props={props} state={state} postMenu={postMenu} />
      </div>
    </div>
  );
}

function ThreadVoteButton({
  reactionType,
  isActive,
  onClick,
  disabled,
}: {
  reactionType: "LIKE" | "DISLIKE";
  isActive: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const lower = reactionType === "LIKE" ? "like" : "dislike";
  const activeLabel = reactionType === "LIKE" ? "Liked" : "Disliked";
  const baseLabel = reactionType === "LIKE" ? "Like" : "Dislike";
  const Icon = reactionType === "LIKE" ? ThumbsUp : ThumbsDown;
  return (
    <button type="button" className={`discussion-post__vote-btn discussion-post__vote-btn--${lower}${isActive ? " is-active" : ""}`} onClick={onClick} disabled={disabled} aria-label={isActive ? `Remove ${lower}` : `${baseLabel} post`} title={isActive ? activeLabel : baseLabel}>
      <Icon size={14} className="discussion-post__vote-icon" aria-hidden="true" />
    </button>
  );
}

function ThreadScore({ score }: { score: number }) {
  return (
    <span className="muted discussion-post__score" aria-label={`Votes ${score}`}>
      <svg className="discussion-post__score-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
        <path d="M8 2.5 13 8h-3v5.5H6V8H3L8 2.5Z" fill="currentColor" />
      </svg>
      <span>{score}</span>
    </span>
  );
}

function ThreadToolbar({ props, state }: { props: DiscussionForumPostThreadProps; state: ThreadState }) {
  const onReact = (type: "LIKE" | "DISLIKE") => {
    if (!state.canReact || props.reactingPostId === props.post.id) {
      return;
    }
    void props.handleReaction(props.post.id, type);
  };

  return (
    <div className="discussion-post__toolbar">
      <div className="discussion-post__toolbar-left">
        <ThreadScore score={props.post.reactionScore} />
        <div className="discussion-post__action-row">
          <ThreadVoteButton reactionType="LIKE" isActive={props.post.myReaction === "LIKE"} onClick={() => onReact("LIKE")} disabled={!state.canReact || props.reactingPostId === props.post.id} />
          <ThreadVoteButton reactionType="DISLIKE" isActive={props.post.myReaction === "DISLIKE"} onClick={() => onReact("DISLIKE")} disabled={!state.canReact || props.reactingPostId === props.post.id} />
        </div>
        {props.isStudent && !state.isAuthor && props.post.myStudentReportStatus === "PENDING" ? <span className="muted discussion-post__reported-tag">Reported</span> : null}
      </div>
    </div>
  );
}

function ThreadReplyEditor({ props }: { props: DiscussionForumPostThreadProps }) {
  if (!props.replyOpenByPostId[props.post.id]) {
    return null;
  }

  return (
    <div className="discussion-post__reply-editor">
      <div className="discussion-field">
        <span>Reply</span>
        <RichTextEditor
          key={props.replyKeyByPostId[props.post.id] ?? 0}
          initialContent={props.replyDrafts[props.post.id] ?? ""}
          onChange={(value) => props.handleReplyChange(props.post.id, value)}
          onEmptyChange={(empty) => props.setReplyEmptyByPostId((prev) => ({ ...prev, [props.post.id]: empty }))}
          placeholder="Write a reply"
          members={props.members}
        />
      </div>
      <div className="discussion-post__reply-editor-actions">
        <button type="button" className="btn btn--primary" onClick={() => void props.handleReplySubmit(props.post.id)} disabled={!props.user || props.userLoading || props.savingReplyPostId === props.post.id || props.replyEmptyByPostId[props.post.id] !== false}>
          {props.savingReplyPostId === props.post.id ? "Replying..." : "Post reply"}
        </button>
      </div>
    </div>
  );
}

function ThreadReplies({ props, state }: { props: DiscussionForumPostThreadProps; state: ThreadState }) {
  if (!(props.post.replies.length > 0 && state.areRepliesExpanded)) {
    return null;
  }

  return (
    <div className="stack discussion-post__replies">
      {state.immediateReplies.map((child) => (
        <DiscussionForumPostThreadView key={child.id} {...props} post={child} depth={state.depth + 1} />
      ))}
    </div>
  );
}

function getArticleClassName(state: ThreadState) {
  return `card discussion-post ${state.isRoot ? "discussion-post--root" : "discussion-post--reply"}${state.isMenuOpen ? " discussion-post--menu-open" : ""}`;
}

export function DiscussionForumPostThreadView(props: DiscussionForumPostThreadProps) {
  const depth = props.depth ?? 0;
  const state = buildThreadState(props, depth);
  const postMenu = createPostMenu(props, state);

  return (
    <article className={getArticleClassName(state)}>
      <div className="discussion-post__header">
        {state.isEditing ? <ThreadEditingHeader props={props} state={state} /> : <ThreadDisplayHeader props={props} state={state} postMenu={postMenu} />}
      </div>
      {state.isEditing ? null : <div className="discussion-post__body"><RichTextViewer content={props.post.body} /></div>}
      <ThreadToolbar props={props} state={state} />
      <ThreadReplyEditor props={props} />
      <ThreadReplies props={props} state={state} />
    </article>
  );
}

export const DiscussionForumPostThread = DiscussionForumPostThreadView;
