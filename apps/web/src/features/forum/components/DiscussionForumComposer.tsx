import type { FormEvent } from "react";
import { RichTextEditor } from "@/shared/ui/rich-text/RichTextEditor";
import type { Member } from "@/shared/ui/rich-text/MentionPlugin";

type DiscussionForumComposerProps = {
  title: string;
  setTitle: (value: string) => void;
  body: string;
  setBody: (value: string) => void;
  setBodyEmpty: (value: boolean) => void;
  userLoading: boolean;
  isSignedIn: boolean;
  canSubmit: boolean;
  composerKey: number;
  members?: Member[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function DiscussionForumComposerTitleField(props: DiscussionForumComposerProps) {
  return (
    <div className="discussion-field">
      <label htmlFor="discussion-title">Title</label>
      <input id="discussion-title" name="title" value={props.title} onChange={(event) => props.setTitle(event.target.value)} placeholder="Add a short, clear title" disabled={!props.isSignedIn || props.userLoading} />
    </div>
  );
}

function DiscussionForumComposerBodyField(props: DiscussionForumComposerProps) {
  return (
    <div className="discussion-field">
      <span>Post</span>
      <RichTextEditor key={props.composerKey} initialContent={props.body} onChange={props.setBody} onEmptyChange={props.setBodyEmpty} placeholder="Write your update or question" members={props.members} />
    </div>
  );
}

function DiscussionForumComposerActions(props: DiscussionForumComposerProps) {
  return (
    <div className="discussion-composer__actions">
      <button type="submit" className="btn btn--primary btn--sm" disabled={!props.canSubmit || !props.isSignedIn || props.userLoading}>
        Post
      </button>
    </div>
  );
}

function DiscussionForumComposerSignInHint({ isSignedIn, userLoading }: Pick<DiscussionForumComposerProps, "isSignedIn" | "userLoading">) {
  if (isSignedIn || userLoading) {
    return null;
  }
  return <p className="ui-note ui-note--muted">Please sign in to create a post.</p>;
}

export function DiscussionForumComposer(props: DiscussionForumComposerProps) {
  return (
    <form className="card discussion-composer" onSubmit={props.onSubmit}>
      <div className="discussion-composer__body">
        <DiscussionForumComposerTitleField {...props} />
        <DiscussionForumComposerBodyField {...props} />
        <DiscussionForumComposerActions {...props} />
        <DiscussionForumComposerSignInHint isSignedIn={props.isSignedIn} userLoading={props.userLoading} />
      </div>
    </form>
  );
}
