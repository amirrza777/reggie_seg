import type { PrismaClient } from "@prisma/client";
import type { QuestionnairePurpose } from "./types.js";

type QuestionnaireTemplateRow = {
  id: number;
  templateName: string;
  questions: Array<{ label: string }>;
};

type GetMyQuestionnaireTemplatesImplArgs = {
  userId: number;
  options?: { query?: string | null; purpose?: QuestionnairePurpose };
  prisma: PrismaClient;
  parsePositiveIntegerSearchQuery: (query: string) => number | null;
  applyFuzzyFallback: <T>(
    initialItems: T[],
    options: {
      query: string;
      fetchFallbackCandidates: (limit: number) => Promise<T[]>;
      matches: (item: T, query: string) => boolean;
      limit?: number;
    },
  ) => Promise<T[]>;
  matchesTemplateSearchQuery: (
    template: { id: number; templateName: string; questions?: Array<{ label: string }> },
    query: string,
  ) => boolean;
};

export async function getMyQuestionnaireTemplatesImpl({
  userId,
  options,
  prisma,
  parsePositiveIntegerSearchQuery,
  applyFuzzyFallback,
  matchesTemplateSearchQuery,
}: GetMyQuestionnaireTemplatesImplArgs) {
  const normalizedQuery = typeof options?.query === "string" ? options.query.trim() : "";
  const hasQuery = normalizedQuery.length > 0;
  const numericQuery = hasQuery ? parsePositiveIntegerSearchQuery(normalizedQuery) : null;
  const purposeFilter = options?.purpose !== undefined ? { purpose: options.purpose } : {};

  const templates = await prisma.questionnaireTemplate.findMany({
    where: hasQuery
      ? {
          ownerId: userId,
          ...purposeFilter,
          OR: [
            { templateName: { contains: normalizedQuery } },
            { questions: { some: { label: { contains: normalizedQuery } } } },
            ...(numericQuery !== null ? [{ id: numericQuery }] : []),
          ],
        }
      : { ownerId: userId, ...purposeFilter },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  return applyFuzzyFallback<QuestionnaireTemplateRow>(templates, {
    query: normalizedQuery,
    fetchFallbackCandidates: async (limit) =>
      prisma.questionnaireTemplate.findMany({
        where: { ownerId: userId, ...purposeFilter },
        include: { questions: { orderBy: { order: "asc" } } },
        take: limit,
      }) as Promise<QuestionnaireTemplateRow[]>,
    matches: (template, query) => matchesTemplateSearchQuery(template, query),
  });
}
