import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import { searchHelpFaqs, searchHelpOverview } from "./search";

describe("help search api", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("searches overview records with fixed limit", async () => {
    const records = [{ id: "t1", title: "Open modules", href: "/staff/modules", kind: "task" as const }];
    apiFetchMock.mockResolvedValue({ items: records });

    const signal = new AbortController().signal;
    const result = await searchHelpOverview("module", records, signal);

    expect(apiFetchMock).toHaveBeenCalledWith("/help/search", {
      method: "POST",
      body: JSON.stringify({
        scope: "overview",
        q: "module",
        limit: 24,
        records,
      }),
      signal,
    });
    expect(result).toEqual(records);
  });

  it("searches faq records with dynamic minimum limit", async () => {
    const records = [
      { id: "f1", groupId: "g1", group: "General", question: "Q1", answer: "A1" },
      { id: "f2", groupId: "g1", group: "General", question: "Q2", answer: "A2" },
    ];
    apiFetchMock.mockResolvedValue({ items: records });

    await searchHelpFaqs("faq", records);
    expect(apiFetchMock).toHaveBeenCalledWith("/help/search", {
      method: "POST",
      body: JSON.stringify({
        scope: "faqs",
        q: "faq",
        limit: 2,
        records,
      }),
      signal: undefined,
    });

    apiFetchMock.mockResolvedValue({ items: [] });
    await searchHelpFaqs("faq", []);
    expect(apiFetchMock).toHaveBeenLastCalledWith("/help/search", {
      method: "POST",
      body: JSON.stringify({
        scope: "faqs",
        q: "faq",
        limit: 1,
        records: [],
      }),
      signal: undefined,
    });
  });
});
