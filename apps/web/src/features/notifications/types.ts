export type Notification = {
  id: number;
  userId: number;
  type: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};
