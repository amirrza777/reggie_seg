import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, falsoMock } = vi.hoisted(() => ({
  prismaMock: {
    discussionPost: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    forumReaction: {
      createMany: vi.fn(),
    },
    forumStudentReport: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  falsoMock: {
    randParagraph: vi.fn(() => "paragraph"),
    randSentence: vi.fn(() => "Sentence text"),
  },
}));

vi.mock("../../prisma/seed/prismaClient", () => ({
  prisma: prismaMock,
}));

vi.mock("@ngneat/falso", () => ({
  randParagraph: falsoMock.randParagraph,
  randSentence: falsoMock.randSentence,
}));

import { planForumReactionSeedData, planForumStudentReportSeedData, seedForumPosts } from "../../prisma/seed/forum";

describe("forum planners", () => {
  it("plans unique reactions and can generate DISLIKE branch", () => {
    const rows = planForumReactionSeedData(
      [
        { id: 1, projectId: 10, authorId: 100 },
        { id: 2, projectId: 10, authorId: 101 },
        { id: 3, projectId: 20, authorId: 102 },
        { id: 4, projectId: 20, authorId: 103 },
      ],
      [{ id: 200 } as any],
      [{ id: 100 } as any, { id: 101 } as any],
    );

    expect(rows.length).toBeGreaterThan(0);
    const keys = rows.map((row) => `${row.postId}:${row.userId}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(rows.some((row) => row.type === "DISLIKE") || rows.some((row) => row.type === "LIKE")).toBe(true);
  });

  it("drops duplicate post-reactor pairs when rotation revisits the same key", () => {
    const rows = planForumReactionSeedData(
      [
        { id: 1, projectId: 10, authorId: 100 },
        { id: 2, projectId: 10, authorId: 101 },
      ],
      [{ id: 900 } as any],
      [],
    );

    const keys = rows.map((row) => `${row.postId}:${row.userId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("generates DISLIKE for odd-index projects on final reaction slot", () => {
    const rows = planForumReactionSeedData(
      [
        { id: 1, projectId: 10, authorId: 100 },
        { id: 2, projectId: 10, authorId: 101 },
        { id: 3, projectId: 10, authorId: 102 },
        { id: 4, projectId: 11, authorId: 103 },
        { id: 5, projectId: 11, authorId: 104 },
        { id: 6, projectId: 11, authorId: 105 },
      ],
      [{ id: 900 } as any],
      [{ id: 100 } as any, { id: 101 } as any, { id: 102 } as any, { id: 103 } as any, { id: 104 } as any, { id: 105 } as any],
    );

    expect(rows.some((row) => row.type === "DISLIKE")).toBe(true);
  });

  it("plans student reports with pending and reviewed paths", () => {
    const rows = planForumStudentReportSeedData(
      [
        { id: 1, projectId: 10, authorId: 300 },
        { id: 2, projectId: 10, authorId: 301 },
        { id: 3, projectId: 20, authorId: 301 },
      ],
      [{ id: 900 } as any],
      [{ id: 300 } as any, { id: 301 } as any, { id: 302 } as any],
    );

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.reporterId !== row.postId)).toBe(true);
    expect(rows.some((row) => row.status === "PENDING")).toBe(true);
  });

  it("skips reaction/report rows when no valid reactor or reporter exists", () => {
    const reactionRows = planForumReactionSeedData(
      [{ id: 1, projectId: 10, authorId: 100 }],
      [{ id: 100 } as any],
      [],
    );
    expect(reactionRows).toHaveLength(0);

    const reportRows = planForumStudentReportSeedData(
      [{ id: 2, projectId: 20, authorId: 300 }],
      [],
      [{ id: 300 } as any],
    );
    expect(reportRows).toHaveLength(0);
  });

  it("can produce reviewed student reports with reviewer ids", () => {
    const rows = planForumStudentReportSeedData(
      [
        { id: 1, projectId: 10, authorId: 300 },
        { id: 2, projectId: 10, authorId: 301 },
      ],
      [{ id: 900 } as any],
      [{ id: 300 } as any, { id: 301 } as any, { id: 302 } as any],
    );

    expect(rows.some((row) => row.status === "APPROVED" && row.reviewedById === 900)).toBe(true);
  });
});

describe("seedForumPosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let postId = 10;
    prismaMock.$transaction.mockImplementation(async (ops: any[]) => Promise.all(ops));
    prismaMock.discussionPost.create.mockImplementation(async ({ data }: any) => ({
      id: postId++,
      projectId: data.projectId,
      authorId: data.authorId,
    }));
    prismaMock.discussionPost.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.forumReaction.createMany.mockResolvedValue({ count: 1 });
    prismaMock.forumStudentReport.createMany.mockResolvedValue({ count: 1 });
  });

  it("skips when no projects", async () => {
    await expect(seedForumPosts([], [{ id: 1 } as any], [{ id: 2 } as any])).resolves.toBeUndefined();
    expect(prismaMock.discussionPost.deleteMany).not.toHaveBeenCalled();
  });

  it("skips when missing staff or students", async () => {
    await expect(seedForumPosts([{ id: 1 } as any], [], [{ id: 2 } as any])).resolves.toBeUndefined();
    await expect(seedForumPosts([{ id: 1 } as any], [{ id: 1 } as any], [])).resolves.toBeUndefined();
  });

  it("creates forum roots/replies/reactions/reports", async () => {
    falsoMock.randParagraph.mockReturnValueOnce(["para a", "para b"] as any).mockReturnValue(["reply a", "reply b"] as any);
    falsoMock.randSentence.mockReturnValue(["forum sentence"] as any);

    await expect(
      seedForumPosts(
        [{ id: 1, moduleId: 1, templateId: 1 }],
        [{ id: 11 } as any],
        [{ id: 22 } as any, { id: 23 } as any],
      ),
    ).resolves.toBeUndefined();

    expect(prismaMock.discussionPost.deleteMany).toHaveBeenCalled();
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    expect(prismaMock.forumReaction.createMany).toHaveBeenCalled();
    expect(prismaMock.forumStudentReport.createMany).toHaveBeenCalled();
  });

  it("joins array paragraphs into body text for roots and replies", async () => {
    falsoMock.randParagraph.mockReturnValue(["alpha", "beta"] as any);
    falsoMock.randSentence.mockReturnValue("Scenario sentence");

    await seedForumPosts(
      [{ id: 1, moduleId: 1, templateId: 1 }],
      [{ id: 11 } as any],
      [{ id: 22 } as any, { id: 23 } as any],
    );

    const bodies = prismaMock.discussionPost.create.mock.calls.map((call) => String(call[0]?.data?.body ?? ""));
    expect(bodies.some((body) => body.includes("alpha\n\nbeta"))).toBe(true);
  });

  it("supports non-array paragraph values for roots and replies", async () => {
    falsoMock.randParagraph.mockReturnValue("single paragraph");
    falsoMock.randSentence.mockReturnValue("Single sentence");

    await seedForumPosts(
      [{ id: 1, moduleId: 1, templateId: 1 }],
      [{ id: 11 } as any],
      [{ id: 22 } as any, { id: 23 } as any],
    );

    const bodies = prismaMock.discussionPost.create.mock.calls.map((call) => String(call[0]?.data?.body ?? ""));
    expect(bodies.some((body) => body.includes("single paragraph"))).toBe(true);
  });

  it("uses fallback reply titles/author ids when transaction returns extra roots", async () => {
    prismaMock.$transaction
      .mockImplementationOnce(async () => [
        { id: 10, projectId: 1 },
        { id: 11, projectId: 1 },
        { id: 12, projectId: 1 },
        { id: 13, projectId: 1 },
      ])
      .mockImplementationOnce(async (ops: any[]) => Promise.all(ops));

    await seedForumPosts([{ id: 1, moduleId: 1, templateId: 1 }], [{ id: 11 } as any], [{ id: 22 } as any, { id: 23 } as any]);

    const replyTitles = prismaMock.discussionPost.create.mock.calls
      .map((call) => call[0]?.data?.title)
      .filter((title) => typeof title === "string" && title.startsWith("Re: "));
    expect(replyTitles.some((title) => title.includes("Discussion thread"))).toBe(true);
  });

  it("skips reaction/report writes when planners return empty rows", async () => {
    await seedForumPosts(
      [{ id: 1, moduleId: 1, templateId: 1 }],
      [{ id: 11 } as any],
      [{ id: 11 } as any],
    );

    expect(prismaMock.forumReaction.createMany).not.toHaveBeenCalled();
    expect(prismaMock.forumStudentReport.createMany).not.toHaveBeenCalled();
  });
});
