import { prisma } from "../../shared/db.js";
import { createComment, deleteComment, createMentions, getMeetingById } from "./repo.js";
import { getTeamMembers, getTeamById } from "../teamAllocation/service/service.js";
import { addNotification } from "../notifications/service.js";
import { extractMentionsFromText, resolveMentionedMembers } from "../../shared/mentions.js";
import { assertProjectMutableForWritesByTeamId } from "../../shared/projectWriteGuard.js";

export async function addComment(meetingId: number, userId: number, content: string, teamId?: number) {
  const meetingRow = await getMeetingById(meetingId);
  if (!meetingRow) throw { code: "NOT_FOUND" };
  await assertProjectMutableForWritesByTeamId(meetingRow.teamId);
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
export async function removeComment(commentId: number) {
  const row = await prisma.meetingComment.findUnique({
    where: { id: commentId },
    select: { meeting: { select: { teamId: true } } },
  });
  if (row?.meeting?.teamId != null) {
    await assertProjectMutableForWritesByTeamId(row.meeting.teamId);
  }
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