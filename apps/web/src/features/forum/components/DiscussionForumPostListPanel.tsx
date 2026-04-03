import type { Member } from "@/shared/ui/MentionPlugin";
import type { DiscussionPost } from "@/features/forum/types";
import { DiscussionForumPosts } from "./DiscussionForumPosts";
import { DiscussionForumPostThread, type ReportConfirmationState } from "./DiscussionForumPostThread";

type DiscussionForumPostListPanelProps = {
  error: string | null;
  userLoading: boolean;
  loadingPosts: boolean;
  posts: DiscussionPost[];
  visiblePosts: DiscussionPost[];
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  user: { id: number; role: string } | null;
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
  handleReplySubmit: (postId: number) => Promise<void>;
  toggleReplies: (post: DiscussionPost, shouldExpand: boolean) => void;
  showMoreReplies: (postId: number) => void;
  toggleReplyBox: (postId: number) => void;
  togglePostMenu: (postId: number) => void;
  closePostMenu: () => void;
  setReportConfirmation: (state: ReportConfirmationState) => void;
};

export function DiscussionForumPostListPanel({
  error,
  userLoading,
  loadingPosts,
  posts,
  visiblePosts,
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  user,
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
}: DiscussionForumPostListPanelProps) {
  return (
    <DiscussionForumPosts
      error={error}
      userLoading={userLoading}
      loadingPosts={loadingPosts}
      posts={posts}
      visiblePosts={visiblePosts}
      currentPage={currentPage}
      totalPages={totalPages}
      onPreviousPage={onPreviousPage}
      onNextPage={onNextPage}
      renderPost={(post) => (
        <DiscussionForumPostThread
          key={post.id}
          post={post}
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
      )}
    />
  );
}
