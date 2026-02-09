import { apiFetch } from "@/shared/api/http";

export async function listMeetings(teamId: number) {
  return apiFetch(`/meetings/team/${teamId}`);
}

export async function getMeeting(meetingId: number) {
  return apiFetch(`/meetings/${meetingId}`);
}

export async function createMeeting(data: {
  teamId: number;
  organiserId: number;
  title: string;
  date: string;
  subject?: string;
  location?: string;
  agenda?: string;
}) {
  return apiFetch("/meetings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteMeeting(meetingId: number) {
  await apiFetch(`/meetings/${meetingId}`, { method: "DELETE" });
}

export async function markAttendance(
  meetingId: number,
  records: { userId: number; status: string }[]
) {
  await apiFetch(`/meetings/${meetingId}/attendance`, {
    method: "PUT",
    body: JSON.stringify({ records }),
  });
}

export async function saveMinutes(
  meetingId: number,
  writerId: number,
  content: string
) {
  return apiFetch(`/meetings/${meetingId}/minutes`, {
    method: "PUT",
    body: JSON.stringify({ writerId, content }),
  });
}

export async function addComment(
  meetingId: number,
  userId: number,
  content: string
) {
  return apiFetch(`/meetings/${meetingId}/comments`, {
    method: "POST",
    body: JSON.stringify({ userId, content }),
  });
}

export async function deleteComment(commentId: number) {
  await apiFetch(`/meetings/comments/${commentId}`, { method: "DELETE" });
}
