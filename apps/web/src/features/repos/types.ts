export type Repository = {
  id: string;
  name: string;
  url: string;
};

export type Commit = {
  id: string;
  message: string;
  author: string;
  date: string;
};
