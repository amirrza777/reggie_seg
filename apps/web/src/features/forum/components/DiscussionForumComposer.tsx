import { RichTextEditor } from "@/shared/ui/RichTextEditor";
import type { Member } from "@/shared/ui/MentionPlugin";

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
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function DiscussionForumComposer({
  title,
  setTitle,
  body,
  setBody,
  setBodyEmpty,
  userLoading,
  isSignedIn,
  canSubmit,
  composerKey,
  members,
  onSubmit,
}: DiscussionForumComposerProps) {
  return (
    <form className="card discussion-composer" onSubmit={onSubmit}>
      <div className="discussion-composer__body">
        <div className="discussion-field">
          <label htmlFor="discussion-title">Title</label>
          <input
            id="discussion-title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a short, clear title"
            disabled={!isSignedIn || userLoading}
          />
        </div>

        <div className="discussion-field">
          <span>Post</span>
          <RichTextEditor
            key={composerKey}
            initialContent={body}
            onChange={setBody}
            onEmptyChange={setBodyEmpty}
            placeholder="Write your update or question"
            members={members}
          />
        </div>

        <div className="discussion-composer__actions">
          <button type="submit" className="btn btn--primary btn--sm" disabled={!canSubmit || !isSignedIn || userLoading}>
            Post
          </button>
        </div>

        {!isSignedIn && !userLoading ? <p className="ui-note ui-note--muted">Please sign in to create a post.</p> : null}
      </div>
    </form>
  );
}
