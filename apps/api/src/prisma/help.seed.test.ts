import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    helpTopic: { upsert: vi.fn() },
    helpArticle: { upsert: vi.fn() },
    helpFaqGroup: { upsert: vi.fn() },
    helpFaq: { upsert: vi.fn() },
  },
}));

vi.mock("../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

import { seedHelpContent } from "../../prisma/seed/help";

describe("seedHelpContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let topicId = 1;
    prismaMock.helpTopic.upsert.mockImplementation(async () => ({ id: topicId++ }));
    let groupId = 100;
    prismaMock.helpFaqGroup.upsert.mockImplementation(async () => ({ id: groupId++ }));
    prismaMock.helpArticle.upsert.mockResolvedValue({ id: 1 });
    prismaMock.helpFaq.upsert.mockResolvedValue({ id: 1 });
  });

  it("upserts topics, articles, faq groups and faqs", async () => {
    await expect(seedHelpContent()).resolves.toBeUndefined();

    expect(prismaMock.helpTopic.upsert).toHaveBeenCalled();
    expect(prismaMock.helpArticle.upsert).toHaveBeenCalled();
    expect(prismaMock.helpFaqGroup.upsert).toHaveBeenCalled();
    expect(prismaMock.helpFaq.upsert).toHaveBeenCalled();

    const faqCreateArgs = prismaMock.helpFaq.upsert.mock.calls.find((call) => call[0]?.where?.slug === "faq-student-projects")?.[0];
    expect(faqCreateArgs).toEqual(
      expect.objectContaining({
        create: expect.objectContaining({
          links: expect.any(Array),
        }),
      }),
    );
  });

  it("throws when a help article cannot resolve its topic", async () => {
    prismaMock.helpTopic.upsert.mockImplementation(async ({ where }: any) => {
      if (where.slug === "overview") return { id: 0 };
      return { id: 1 };
    });

    await expect(seedHelpContent()).rejects.toThrow("Missing help topic for article");
  });

  it("throws when an faq cannot resolve its group id", async () => {
    prismaMock.helpFaqGroup.upsert.mockImplementation(async ({ where }: any) => {
      if (where.slug === "faq-general") return { id: 0 };
      return { id: 1 };
    });

    await expect(seedHelpContent()).rejects.toThrow("Missing FAQ group");
  });
});
