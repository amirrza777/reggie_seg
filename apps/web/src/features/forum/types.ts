export type DiscussionPost = {
  id: number;
  parentPostId: number | null;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  reactionScore: number;
  myReaction: "LIKE" | "DISLIKE" | null;
  myStudentReportStatus?: "PENDING" | "APPROVED" | "IGNORED" | null;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    role: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
  };
  replies: DiscussionPost[];
};

export type StudentForumReportEntry = {
  id: number;
  createdAt: string;
  reason: string | null;
  reportCount: number;
  post: {
    id: number;
    title: string;
    body: string;
    createdAt: string;
    author: {
      id: number;
      firstName: string;
      lastName: string;
      role: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
    };
  };
  reporter: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
  };
};

export type ForumConversationPost = {
  id: number;
  parentPostId: number | null;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    role: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
  };
  replies: ForumConversationPost[];
};

export type ForumPostConversation = {
  focusPostId: number;
  thread: ForumConversationPost | null;
  missingPost: boolean;
};

export type ForumSettings = {
  forumIsAnonymous: boolean;
};
