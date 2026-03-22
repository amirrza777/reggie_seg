export type ForumReportEntry = {
  id: number;
  createdAt: string;
  reason: string | null;
  title: string;
  body: string;
  postId: number;
  project: {
    id: number;
    name: string;
    module: { name: string };
  };
  reporter: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
  };
  author: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
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
    email: string;
    firstName: string;
    lastName: string;
    role: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
  };
  replies: ForumConversationPost[];
};

export type ForumReportConversation = {
  focusPostId: number;
  thread: ForumConversationPost;
  missingPost: boolean;
};
