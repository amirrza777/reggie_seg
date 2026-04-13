import type { Member } from "@/shared/ui/rich-text/MentionPlugin";
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

type DiscussionForumPostThreadSharedProps = Omit<React.ComponentProps<typeof DiscussionForumPostThread>, "post">;

export function DiscussionForumPostListPanel(props: DiscussionForumPostListPanelProps) {
  const threadSharedProps: DiscussionForumPostThreadSharedProps = props;

  return (
    <DiscussionForumPosts
      error={props.error}
      userLoading={props.userLoading}
      loadingPosts={props.loadingPosts}
      posts={props.posts}
      visiblePosts={props.visiblePosts}
      currentPage={props.currentPage}
      totalPages={props.totalPages}
      onPreviousPage={props.onPreviousPage}
      onNextPage={props.onNextPage}
      renderPost={(post) => <DiscussionForumPostThread key={post.id} post={post} {...threadSharedProps} />}
    />
  );
}
