export type Meeting = {
  id: string;
  title: string;
  date: string;
  summary?: string;
};

export type Attendee = {
  id: string;
  name: string;
  present: boolean;
};
