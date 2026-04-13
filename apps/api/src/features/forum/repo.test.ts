import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDiscussionPostsForProject,
  createStudentReport,
  approveStudentReport,
  getStaffConversationForPost,
  reportDiscussionPost,
} from "./repo.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    discussionPost: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    forumReport: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    forumStudentReport: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
    forumReaction: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    teamAllocation: {
      findFirst: vi.fn(),
    },
    moduleLead: {
      findMany: vi.fn(),
    },
    moduleTeachingAssistant: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const prismaMock = vi.mocked(prisma);

describe("forum repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.moduleLead.findMany.mockResolvedValue([] as any);
    prismaMock.moduleTeachingAssistant.findMany.mockResolvedValue([] as any);
    prismaMock.forumStudentReport.create.mockResolvedValue({ id: 100 } as any);
    prismaMock.forumStudentReport.update.mockResolvedValue({ id: 100 } as any);
  });

  it("returns null when user is not in the project", async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);

    const result = await getDiscussionPostsForProject(5, 99);

    expect(result).toBeNull();
    expect(prismaMock.discussionPost.findMany).not.toHaveBeenCalled();
  });

  it("filters reported posts and descendants, and attaches myStudentReportStatus", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 10 } as any);
    prismaMock.project.findUnique.mockResolvedValue({ forumIsAnonymous: false } as any);
    prismaMock.discussionPost.findMany.mockResolvedValue([
      {
        id: 1,
        title: "Root",
        body: "Root body",
        createdAt: new Date("2026-03-01T10:00:00Z"),
        updatedAt: new Date("2026-03-01T10:00:00Z"),
        parentPostId: null,
        author: { id: 7, firstName: "A", lastName: "B", role: "STUDENT" },
      },
      {
        id: 2,
        title: "Reply",
        body: "Reply body",
        createdAt: new Date("2026-03-01T11:00:00Z"),
        updatedAt: new Date("2026-03-01T11:00:00Z"),
        parentPostId: 1,
        author: { id: 8, firstName: "C", lastName: "D", role: "STUDENT" },
      },
      {
        id: 3,
        title: "Other",
        body: "Other body",
        createdAt: new Date("2026-03-02T10:00:00Z"),
        updatedAt: new Date("2026-03-02T10:00:00Z"),
        parentPostId: null,
        author: { id: 9, firstName: "E", lastName: "F", role: "STUDENT" },
      },
    ] as any);
    prismaMock.forumReport.findMany.mockResolvedValue([{ postId: 1 }]);
    prismaMock.forumReaction.findMany.mockResolvedValue([]);
    prismaMock.forumReaction.groupBy.mockResolvedValue([]);
    prismaMock.forumStudentReport.findMany.mockResolvedValue([
      { postId: 3, status: "PENDING" },
    ] as any);

    const result = await getDiscussionPostsForProject(5, 10);

    expect(result?.map((post) => post.id)).toEqual([3]);
    expect(result?.[0].myStudentReportStatus).toBe("PENDING");
  });

  it("labels staff author as MODULE_LEAD when assigned as module lead for the project module", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 10 } as any);
    prismaMock.project.findUnique.mockResolvedValue({ forumIsAnonymous: false, moduleId: 77 } as any);
    prismaMock.discussionPost.findMany.mockResolvedValue([
      {
        id: 1,
        title: "Lead post",
        body: "Lead body",
        createdAt: new Date("2026-03-01T10:00:00Z"),
        updatedAt: new Date("2026-03-01T10:00:00Z"),
        parentPostId: null,
        author: { id: 7, firstName: "Marker", lastName: "Staff", role: "STAFF" },
      },
    ] as any);
    prismaMock.forumReport.findMany.mockResolvedValue([]);
    prismaMock.forumReaction.findMany.mockResolvedValue([]);
    prismaMock.forumReaction.groupBy.mockResolvedValue([]);
    prismaMock.forumStudentReport.findMany.mockResolvedValue([]);
    prismaMock.moduleLead.findMany.mockResolvedValue([{ userId: 7 }] as any);
    prismaMock.moduleTeachingAssistant.findMany.mockResolvedValue([]);

    const result = await getDiscussionPostsForProject(7, 10);

    expect(result).toHaveLength(1);
    expect(result?.[0]?.author.forumRole).toBe("MODULE_LEAD");
  });

  it("prevents student report when role is not STUDENT", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 10 } as any);
    prismaMock.user.findUnique.mockResolvedValue({ role: "STAFF" } as any);

    const result = await createStudentReport(5, 10, 4, "reason");

    expect(result).toEqual({ status: "forbidden" });
    expect(prismaMock.forumStudentReport.create).not.toHaveBeenCalled();
  });

  it("reopens ignored student report as pending", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 10 } as any);
    prismaMock.user.findUnique.mockResolvedValue({ role: "STUDENT" } as any);
    prismaMock.discussionPost.findFirst.mockResolvedValue({ id: 4 } as any);
    prismaMock.forumReport.findFirst.mockResolvedValue(null);
    prismaMock.forumStudentReport.findFirst
      .mockResolvedValueOnce({ id: 1, status: "IGNORED" } as any)
      .mockResolvedValueOnce({ id: 1 } as any);
    prismaMock.forumStudentReport.update.mockResolvedValue({ id: 1 } as any);

    const result = await createStudentReport(5, 10, 4, "reason");

    expect(result).toEqual({ status: "ok", shouldNotifyStaff: true });
    expect(prismaMock.forumStudentReport.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ status: "PENDING", reason: "reason", reviewedAt: null, reviewedById: null }),
      select: { id: true },
    });
  });

  it("returns shouldNotifyStaff false when the post already has a pending student report", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 10 } as any);
    prismaMock.user.findUnique.mockResolvedValue({ role: "STUDENT" } as any);
    prismaMock.discussionPost.findFirst.mockResolvedValue({ id: 4 } as any);
    prismaMock.forumReport.findFirst.mockResolvedValue(null);
    prismaMock.forumStudentReport.findFirst
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce({ id: 99 } as any);
    prismaMock.forumStudentReport.create.mockResolvedValue({ id: 101 } as any);

    const result = await createStudentReport(5, 10, 4, "reason");

    expect(result).toEqual({ status: "ok", shouldNotifyStaff: false });
    expect(prismaMock.forumStudentReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ postId: 4, projectId: 10, reporterId: 5, reason: "reason" }),
      select: { id: true },
    });
  });

  it("returns shouldNotifyStaff true when creating the first pending report for a post", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 10 } as any);
    prismaMock.user.findUnique.mockResolvedValue({ role: "STUDENT" } as any);
    prismaMock.discussionPost.findFirst.mockResolvedValue({ id: 4 } as any);
    prismaMock.forumReport.findFirst.mockResolvedValue(null);
    prismaMock.forumStudentReport.findFirst
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce({ id: 101 } as any);
    prismaMock.forumStudentReport.create.mockResolvedValue({ id: 101 } as any);

    const result = await createStudentReport(5, 10, 4, "reason");

    expect(result).toEqual({ status: "ok", shouldNotifyStaff: true });
  });

  it("approves student report and creates staff report when missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 99, role: "STAFF", enterpriseId: "ent-1" } as any);
    prismaMock.project.findFirst.mockResolvedValue({ id: 10 } as any);
    prismaMock.forumStudentReport.findFirst.mockResolvedValue({ id: 7, postId: 4 } as any);
    prismaMock.discussionPost.findFirst.mockResolvedValue({
      id: 4,
      authorId: 12,
      title: "t",
      body: "b",
      createdAt: new Date("2026-03-01T10:00:00Z"),
      updatedAt: new Date("2026-03-01T10:00:00Z"),
      parentPostId: null,
    } as any);

    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
    prismaMock.forumReport.findFirst.mockResolvedValue(null);

    const result = await approveStudentReport(99, 10, 7);

    expect(result).toEqual({ status: "ok" });
    expect(prismaMock.forumReport.create).toHaveBeenCalled();
    expect(prismaMock.forumStudentReport.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({ status: "APPROVED", reviewedById: 99 }),
    });
  });

  it("stores long post bodies when staff reports a discussion post", async () => {
    const longBody = "x".repeat(500);
    prismaMock.user.findUnique.mockResolvedValue({ id: 99, role: "STAFF", enterpriseId: "ent-1" } as any);
    prismaMock.project.findFirst.mockResolvedValue({ id: 10 } as any);
    prismaMock.discussionPost.findFirst.mockResolvedValue({
      id: 4,
      authorId: 12,
      title: "Long post",
      body: longBody,
      createdAt: new Date("2026-03-01T10:00:00Z"),
      updatedAt: new Date("2026-03-01T10:00:00Z"),
      parentPostId: null,
    } as any);

    const result = await reportDiscussionPost(99, 10, 4, "needs review");

    expect(result).toEqual({ status: "ok" });
    expect(prismaMock.forumReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: 10,
        postId: 4,
        reporterId: 99,
        authorId: 12,
        reason: "needs review",
        title: "Long post",
        body: longBody,
      }),
    });
  });

  it("returns forbidden when user cannot manage forum settings while reporting", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null as any);

    const result = await reportDiscussionPost(99, 10, 4, "needs review");

    expect(result).toEqual({ status: "forbidden" });
    expect(prismaMock.discussionPost.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.forumReport.create).not.toHaveBeenCalled();
  });

  it("returns not_found when reporting a discussion post that does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 99, role: "STAFF", enterpriseId: "ent-1" } as any);
    prismaMock.project.findFirst.mockResolvedValue({ id: 10 } as any);
    prismaMock.discussionPost.findFirst.mockResolvedValue(null as any);

    const result = await reportDiscussionPost(99, 10, 4, "needs review");

    expect(result).toEqual({ status: "not_found" });
    expect(prismaMock.forumReport.create).not.toHaveBeenCalled();
  });

  it("normalizes blank report reason to null", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 99, role: "STAFF", enterpriseId: "ent-1" } as any);
    prismaMock.project.findFirst.mockResolvedValue({ id: 10 } as any);
    prismaMock.discussionPost.findFirst.mockResolvedValue({
      id: 4,
      authorId: 12,
      title: "Post title",
      body: "Post body",
      createdAt: new Date("2026-03-01T10:00:00Z"),
      updatedAt: new Date("2026-03-01T10:00:00Z"),
      parentPostId: null,
    } as any);

    const result = await reportDiscussionPost(99, 10, 4, "   ");

    expect(result).toEqual({ status: "ok" });
    expect(prismaMock.forumReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reason: null,
      }),
    });
  });

  it("returns missingPost when staff conversation focus is missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 2, role: "STAFF", enterpriseId: "ent-1" } as any);
    prismaMock.project.findFirst.mockResolvedValue({ id: 10 } as any);
    prismaMock.discussionPost.findMany.mockResolvedValue([] as any);
    prismaMock.project.findUnique.mockResolvedValue({ forumIsAnonymous: false } as any);
    prismaMock.forumReport.findMany.mockResolvedValue([]);
    prismaMock.forumReaction.findMany.mockResolvedValue([]);
    prismaMock.forumReaction.groupBy.mockResolvedValue([]);
    prismaMock.forumStudentReport.findMany.mockResolvedValue([]);

    const result = await getStaffConversationForPost(2, 10, 99);

    expect(result).toEqual({ focusPostId: 99, thread: null, missingPost: true });
  });
});
