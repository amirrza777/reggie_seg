export type DiscussionPost = {
  id: number;
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
};

export type ForumSettings = {
  forumIsAnonymous: boolean;
};
