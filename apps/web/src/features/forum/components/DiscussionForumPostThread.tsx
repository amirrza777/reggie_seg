import { DiscussionForumPostThreadView } from "./DiscussionForumPostThread.view";
import type { DiscussionForumPostThreadProps } from "./DiscussionForumPostThread.types";

export type { ReportConfirmationState } from "./DiscussionForumPostThread.types";

export function DiscussionForumPostThread(props: DiscussionForumPostThreadProps) {
  return <DiscussionForumPostThreadView {...props} />;
}
