import { DiscussionPostsSkeleton } from "@/shared/ui/LoadingSkeletonBlocks";
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

export function DiscussionForumPosts({
  error,
  userLoading,
  loadingPosts,
  posts,
  visiblePosts,
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  renderPost,
}: DiscussionForumPostsProps) {
  return (
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
              onPreviousPage={onPreviousPage}
              onNextPage={onNextPage}
            >
              <PaginationPageIndicator page={currentPage} totalPages={totalPages} />
            </PaginationControls>
          ) : null}
        </>
      )}
    </section>
  );
}
