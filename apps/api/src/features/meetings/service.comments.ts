import { createComment, deleteComment, createMentions } from "./repo.js";
import { getTeamMembers, getTeamById } from "../teamAllocation/service.js";
import { addNotification } from "../notifications/service.js";
import { extractMentionsFromText, resolveMentionedMembers } from "../../shared/mentions.js";

export async function addComment(meetingId: number, userId: number, content: string, teamId?: number) {
  const comment = await createComment(meetingId, userId, content);
  if (teamId) {
    try {
      await handleCommentMentions(comment.id, meetingId, userId, content, teamId);
    } catch (error) {
      console.error("Failed to process comment mentions:", error);
    }
  }
  return comment;
}

/** Removes the comment. */
export function removeComment(commentId: number) {
  return deleteComment(commentId);
}

async function handleCommentMentions(
  commentId: number,
  meetingId: number,
  userId: number,
  content: string,
  teamId: number,
) {
  const mentionedNames = extractMentionsFromText(content);
  if (mentionedNames.length === 0) return;

  const members = await getTeamMembers(teamId);
  const matched = resolveMentionedMembers(mentionedNames, members, userId);
  if (matched.length === 0) return;

  const matchedIds = matched.map((m) => m.id);
  await createMentions(commentId, matchedIds);

  const team = await getTeamById(teamId);
  const author = members.find((member) => member.id === userId);
  const authorName = author ? `${author.firstName} ${author.lastName}` : "Someone";

  await Promise.all(
    matchedIds.map((mentionedId) =>
      addNotification({
        userId: mentionedId,
        type: "MENTION",
        message: `${authorName} mentioned you in a comment`,
        link: `/projects/${team.projectId}/meetings/${meetingId}`,
      })
    )
  );
}
