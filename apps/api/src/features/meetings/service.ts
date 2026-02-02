import {
  getMeetingsByTeamId,
  getMeetingById,
  createMeeting,
  deleteMeeting,
  bulkUpsertAttendance,
  upsertMinutes,
  createComment,
  deleteComment,
} from "./repo.js";

export function listMeetings(teamId: number) {
  return getMeetingsByTeamId(teamId);
}

export function fetchMeeting(meetingId: number) {
  return getMeetingById(meetingId);
}

export function addMeeting(data: {
  teamId: number;
  organiserId: number;
  title: string;
  date: Date;
  subject?: string;
  location?: string;
  agenda?: string;
}) {
  return createMeeting(data);
}

export function removeMeeting(meetingId: number) {
  return deleteMeeting(meetingId);
}

export function markAttendance(meetingId: number, records: { userId: number; status: string }[]) {
  return bulkUpsertAttendance(meetingId, records);
}

export function saveMinutes(meetingId: number, writerId: number, content: string) {
  return upsertMinutes(meetingId, writerId, content);
}

export function addComment(meetingId: number, userId: number, content: string) {
  return createComment(meetingId, userId, content);
}

export function removeComment(commentId: number) {
  return deleteComment(commentId);
}
