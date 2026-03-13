export type DiscussionPost = {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
  };
};
