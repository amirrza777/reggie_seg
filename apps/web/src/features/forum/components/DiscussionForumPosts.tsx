import { DiscussionPostsSkeleton } from "@/shared/ui/skeletons/LoadingSkeletonBlocks";
import { PaginationControls, PaginationPageIndicator } from "@/shared/ui/PaginationControls";
import type { DiscussionPost } from "@/features/forum/types";

type DiscussionForumPostsProps = {
  error: string | null;
  userLoading: boolean;
  loadingPosts: boolean;
  posts: DiscussionPost[];
  visiblePosts: DiscussionPost[];
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  renderPost: (post: DiscussionPost) => React.ReactNode;
};

function DiscussionForumPostsPagination(props: DiscussionForumPostsProps) {
  if (props.totalPages <= 1) {
    return null;
  }
  return (
    <PaginationControls as="nav" className="discussion-posts__pagination" ariaLabel="Discussion posts pagination" page={props.currentPage} totalPages={props.totalPages} onPreviousPage={props.onPreviousPage} onNextPage={props.onNextPage}>
      <PaginationPageIndicator page={props.currentPage} totalPages={props.totalPages} />
    </PaginationControls>
  );
}

function DiscussionForumPostsBody(props: DiscussionForumPostsProps) {
  if (props.userLoading || props.loadingPosts) {
    return <DiscussionPostsSkeleton />;
  }
  if (props.posts.length === 0) {
    return (
      <div className="ui-empty-state">
        <p>No posts yet. Start the discussion above.</p>
      </div>
    );
  }
  return (
    <>
      {props.visiblePosts.map((post) => props.renderPost(post))}
      <DiscussionForumPostsPagination {...props} />
    </>
  );
}

export function DiscussionForumPosts(props: DiscussionForumPostsProps) {
  return (
    <section className="stack discussion-posts" aria-label="Posts">
      <h2 className="discussion-posts__title">Latest posts</h2>
      {props.error ? <p className="ui-note ui-note--error">{props.error}</p> : null}
      <DiscussionForumPostsBody {...props} />
    </section>
  );
}
