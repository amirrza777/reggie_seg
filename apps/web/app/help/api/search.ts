import { apiFetch } from "@/shared/api/http";

export type HelpOverviewRecord = {
  id: string;
  title: string;
  description?: string;
  href: string;
  kind: "task" | "faq";
  group?: string;
};

export type HelpFaqRecord = {
  id: string;
  groupId: string;
  group: string;
  question: string;
  answer: string;
  links?: Array<{ label: string; href: string }>;
};

type HelpSearchResponse<T> = {
  items: T[];
};

export async function searchHelpOverview(
  q: string,
  records: HelpOverviewRecord[],
  signal?: AbortSignal,
): Promise<HelpOverviewRecord[]> {
  const response = await apiFetch<HelpSearchResponse<HelpOverviewRecord>>("/help/search", {
    method: "POST",
    body: JSON.stringify({
      scope: "overview",
      q,
      limit: 24,
      records,
    }),
    signal,
  });
  return response.items;
}

export async function searchHelpFaqs(
  q: string,
  records: HelpFaqRecord[],
  signal?: AbortSignal,
): Promise<HelpFaqRecord[]> {
  const response = await apiFetch<HelpSearchResponse<HelpFaqRecord>>("/help/search", {
    method: "POST",
    body: JSON.stringify({
      scope: "faqs",
      q,
      limit: Math.max(records.length, 1),
      records,
    }),
    signal,
  });
  return response.items;
}
