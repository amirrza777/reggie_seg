export type SeedHelpTopic = {
  slug: string;
  title: string;
  description?: string;
  sortOrder: number;
};

export type SeedHelpArticle = {
  slug: string;
  topicSlug: string;
  title: string;
  summary?: string;
  audience?: string;
  sortOrder: number;
  body: string;
};

export type SeedHelpFaqGroup = {
  slug: string;
  topicSlug: string;
  title: string;
  description?: string;
  audience?: string;
  sortOrder: number;
};

export type SeedHelpFaq = {
  slug: string;
  groupSlug: string;
  question: string;
  answer: string;
  sortOrder: number;
  links?: Array<{ label: string; href: string }>;
};
