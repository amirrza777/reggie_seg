export type Meeting = {
  id: number;
  teamId: number;
  organiserId: number;
  title: string;
  subject: string | null;
  location: string | null;
  agenda: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  organiser: {
    id: number;
    firstName: string;
    lastName: string;
  };
  attendances: MeetingAttendanceRecord[];
  minutes: MeetingMinutesRecord | null;
  comments: MeetingCommentRecord[];
};

export type MeetingAttendanceRecord = {
  id: number;
  meetingId: number;
  userId: number;
  status: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
  };
};

export type MeetingMinutesRecord = {
  id: number;
  meetingId: number;
  writerId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type MeetingCommentRecord = {
  id: number;
  meetingId: number;
  userId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
  };
};
