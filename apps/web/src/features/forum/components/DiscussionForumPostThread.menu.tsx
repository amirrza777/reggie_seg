import { Ellipsis } from "lucide-react";

type DiscussionForumPostThreadMenuProps = {
  isMenuOpen: boolean;
  canReply: boolean;
  canManageOwnPost: boolean;
  canReportPost: boolean;
  isDeletingPost: boolean;
  isReportingPost: boolean;
  isReplyOpen: boolean;
  onToggleMenu: () => void;
  onToggleReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
};

type DiscussionForumThreadMenuAction = {
  key: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
};

function getThreadMenuActions(props: DiscussionForumPostThreadMenuProps): DiscussionForumThreadMenuAction[] {
  const actions: DiscussionForumThreadMenuAction[] = [];
  if (props.canReply) {
    actions.push({ key: "reply", label: props.isReplyOpen ? "Cancel reply" : "Reply", onClick: props.onToggleReply });
  }
  if (props.canManageOwnPost) {
    actions.push({ key: "edit", label: "Edit", onClick: props.onEdit });
    actions.push({ key: "delete", label: props.isDeletingPost ? "Deleting..." : "Delete", onClick: props.onDelete, disabled: props.isDeletingPost, danger: true });
  }
  if (props.canReportPost) {
    actions.push({ key: "report", label: props.isReportingPost ? "Reporting..." : "Report", onClick: props.onReport, disabled: props.isReportingPost });
  }
  return actions;
}

function DiscussionForumPostThreadMenuPanel({ actions }: { actions: DiscussionForumThreadMenuAction[] }) {
  return (
    <div className="discussion-post__menu-panel">
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          className={`discussion-post__menu-item${action.danger ? " discussion-post__menu-item--danger" : ""}`}
          disabled={action.disabled}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

export function DiscussionForumPostThreadMenu(props: DiscussionForumPostThreadMenuProps) {
  const actions = getThreadMenuActions(props);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="discussion-post__menu">
      <button
        type="button"
        className="btn btn--ghost btn--sm discussion-post__menu-trigger"
        aria-label="Post actions"
        aria-expanded={props.isMenuOpen}
        onClick={props.onToggleMenu}
      >
        <Ellipsis size={15} aria-hidden="true" />
      </button>
      {props.isMenuOpen ? <DiscussionForumPostThreadMenuPanel actions={actions} /> : null}
    </div>
  );
}
