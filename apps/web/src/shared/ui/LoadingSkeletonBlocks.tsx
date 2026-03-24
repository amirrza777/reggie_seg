import { Skeleton, SkeletonText } from "./Skeleton";

type DiscussionPostsSkeletonProps = {
  includeHeading?: boolean;
  loadingLabel?: string;
  announce?: boolean;
};

export function DiscussionPostsSkeleton({
  includeHeading = false,
  loadingLabel = "Loading posts...",
  announce = true,
}: DiscussionPostsSkeletonProps) {
  const announceProps = announce ? { role: "status", "aria-live": "polite" as const } : undefined;

  return (
    <>
      {includeHeading ? <Skeleton width="170px" height="22px" /> : null}
      <div className="discussion-posts__skeleton-list" {...announceProps}>
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="card discussion-post discussion-post--root discussion-post--skeleton">
            <div className="discussion-post__header">
              <div className="discussion-post__title-row">
                <div className="discussion-post__headline">
                  <Skeleton className="discussion-posts__skeleton-title" />
                  <Skeleton className="discussion-posts__skeleton-meta" />
                </div>
                <Skeleton className="discussion-posts__skeleton-menu" />
              </div>
            </div>
            <SkeletonText className="discussion-posts__skeleton-body" lines={2} widths={["100%", "76%"]} />
            <div className="discussion-posts__skeleton-toolbar">
              <Skeleton inline className="discussion-posts__skeleton-action" />
              <Skeleton inline className="discussion-posts__skeleton-action" />
              <Skeleton inline className="discussion-posts__skeleton-action" />
            </div>
          </article>
        ))}
        {announce ? <span className="ui-visually-hidden">{loadingLabel}</span> : null}
      </div>
    </>
  );
}

type QuestionnaireListSkeletonProps = {
  loadingLabel?: string;
  announce?: boolean;
};

export function QuestionnaireListSkeleton({
  loadingLabel = "Loading questionnaires...",
  announce = true,
}: QuestionnaireListSkeletonProps) {
  const announceProps = announce ? { role: "status", "aria-live": "polite" as const } : undefined;

  return (
    <div className="questionnaire-editor__list-shell" {...announceProps}>
      <div className="questionnaire-editor__actions">
        <Skeleton inline height="36px" width="156px" radius="10px" />
        <Skeleton inline height="36px" width="186px" radius="10px" />
      </div>
      <div className="questionnaire-editor__list-sections">
        <section className="stack">
          <Skeleton inline height="20px" width="220px" />
          <div className="questionnaire-editor__list-card">
            <SkeletonText lines={2} widths={["54%", "34%"]} />
          </div>
          <div className="questionnaire-editor__list-card">
            <SkeletonText lines={2} widths={["48%", "30%"]} />
          </div>
        </section>
        <section className="stack">
          <Skeleton inline height="20px" width="240px" />
          <div className="questionnaire-editor__list-card">
            <SkeletonText lines={2} widths={["58%", "36%"]} />
          </div>
        </section>
      </div>
      {announce ? <span className="ui-visually-hidden">{loadingLabel}</span> : null}
    </div>
  );
}
