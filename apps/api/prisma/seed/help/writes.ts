import type { Prisma } from "@prisma/client";
import { prisma } from "../prismaClient";
import type { SeedHelpArticle, SeedHelpFaq, SeedHelpFaqGroup, SeedHelpTopic } from "./types";

export async function upsertHelpTopics(topics: SeedHelpTopic[]) {
  const topicIds = new Map<string, number>();
  for (const topic of topics) {
    const record = await prisma.helpTopic.upsert({
      where: { slug: topic.slug },
      update: {
        title: topic.title,
        description: topic.description ?? null,
        sortOrder: topic.sortOrder,
        published: true,
      },
      create: {
        slug: topic.slug,
        title: topic.title,
        description: topic.description ?? null,
        sortOrder: topic.sortOrder,
        published: true,
      },
      select: { id: true },
    });
    topicIds.set(topic.slug, record.id);
  }
  return topicIds;
}

export async function upsertHelpArticles(articles: SeedHelpArticle[], topicIds: Map<string, number>) {
  for (const article of articles) {
    const topicId = topicIds.get(article.topicSlug);
    if (!topicId) throw new Error(`Missing help topic for article ${article.slug}`);
    await prisma.helpArticle.upsert({
      where: { slug: article.slug },
      update: buildHelpArticleWrite(topicId, article),
      create: { slug: article.slug, ...buildHelpArticleWrite(topicId, article) },
    });
  }
}

export async function upsertHelpFaqGroups(groups: SeedHelpFaqGroup[], topicIds: Map<string, number>) {
  const groupIds = new Map<string, number>();
  for (const group of groups) {
    const topicId = topicIds.get(group.topicSlug);
    const record = await prisma.helpFaqGroup.upsert({
      where: { slug: group.slug },
      update: buildHelpFaqGroupWrite(topicId, group),
      create: { slug: group.slug, ...buildHelpFaqGroupWrite(topicId, group) },
      select: { id: true },
    });
    groupIds.set(group.slug, record.id);
  }
  return groupIds;
}

export async function upsertHelpFaqs(faqs: SeedHelpFaq[], groupIds: Map<string, number>) {
  for (const faq of faqs) {
    const groupId = groupIds.get(faq.groupSlug);
    if (!groupId) throw new Error(`Missing FAQ group for ${faq.slug}`);
    await prisma.helpFaq.upsert({
      where: { slug: faq.slug },
      update: buildHelpFaqWrite(groupId, faq),
      create: { slug: faq.slug, ...buildHelpFaqWrite(groupId, faq) },
    });
  }
}

function buildHelpArticleWrite(topicId: number, article: SeedHelpArticle) {
  return {
    topicId,
    title: article.title,
    summary: article.summary ?? null,
    body: article.body,
    audience: article.audience ?? null,
    sortOrder: article.sortOrder,
    published: true,
  };
}

function buildHelpFaqGroupWrite(topicId: number | undefined, group: SeedHelpFaqGroup) {
  return {
    topicId,
    title: group.title,
    description: group.description ?? null,
    audience: group.audience ?? null,
    sortOrder: group.sortOrder,
    published: true,
  };
}

function buildHelpFaqWrite(groupId: number, faq: SeedHelpFaq) {
  const data: {
    groupId: number;
    question: string;
    answer: string;
    sortOrder: number;
    published: boolean;
    links?: Prisma.InputJsonValue;
  } = {
    groupId,
    question: faq.question,
    answer: faq.answer,
    sortOrder: faq.sortOrder,
    published: true,
  };
  if (faq.links) data.links = faq.links as Prisma.InputJsonValue;
  return data;
}
