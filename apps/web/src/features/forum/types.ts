export type DiscussionPost = {
  id: number;
  parentPostId: number | null;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  reactionScore: number;
  myReaction: "LIKE" | "DISLIKE" | null;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    role: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
  };
  replies: DiscussionPost[];
};

export type ForumSettings = {
  forumIsAnonymous: boolean;
};
