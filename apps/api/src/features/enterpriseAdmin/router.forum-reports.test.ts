import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import router from "./router.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    forumReport: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    discussionPost: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const prismaMock = vi.mocked(prisma);

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function findHandler(path: string, method: "get" | "delete") {
  const layer = router.stack.find((entry: any) => entry.route?.path === path && entry.route?.methods?.[method]);
  return layer?.route?.stack?.[0]?.handle as (req: any, res: any) => Promise<void>;
}

describe("enterprise forum reports routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 500 when enterprise user is missing", async () => {
    const handler = findHandler("/forum-reports", "get");
    const res = mockResponse();

    await handler({} as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Enterprise not resolved" });
  });

  it("returns 403 when enterprise user lacks role", async () => {
    const handler = findHandler("/forum-reports", "get");
    const res = mockResponse();
    await handler({ enterpriseUser: { enterpriseId: "ent-1", role: "STAFF" } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns forum reports for enterprise admins", async () => {
    const handler = findHandler("/forum-reports", "get");
    prismaMock.forumReport.findMany.mockResolvedValue([{ id: 1 }] as any);
    const res = mockResponse();
    await handler({ enterpriseUser: { enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } }, res);
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it("returns 400 for invalid conversation report id", async () => {
    const handler = findHandler("/forum-reports/:id/conversation", "get");
    const res = mockResponse();
    await handler({ params: { id: "abc" }, enterpriseUser: { enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns missingPost when report post no longer exists", async () => {
    const handler = findHandler("/forum-reports/:id/conversation", "get");
    prismaMock.forumReport.findFirst.mockResolvedValue({
      id: 1,
      postId: 5,
      projectId: 10,
      title: "T",
      body: "B",
      postCreatedAt: new Date("2026-03-01T10:00:00Z"),
      postUpdatedAt: new Date("2026-03-01T10:00:00Z"),
      author: { id: 1, firstName: "A", lastName: "B", email: "a@b.com", role: "STUDENT" },
    } as any);
    prismaMock.discussionPost.findMany.mockResolvedValue([]);
    const res = mockResponse();
    await handler({ params: { id: "1" }, enterpriseUser: { enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } }, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ focusPostId: 5, missingPost: true })
    );
  });

  it("returns 404 when conversation report does not exist", async () => {
    const handler = findHandler("/forum-reports/:id/conversation", "get");
    prismaMock.forumReport.findFirst.mockResolvedValueOnce(null);
    const res = mockResponse();

    await handler({ params: { id: "1" }, enterpriseUser: { enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } } as any, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Report not found" });
  });

  it("returns threaded conversation rooted at the oldest ancestor", async () => {
    const handler = findHandler("/forum-reports/:id/conversation", "get");
    prismaMock.forumReport.findFirst.mockResolvedValueOnce({
      id: 1,
      postId: 3,
      projectId: 10,
      title: "T",
      body: "B",
      postCreatedAt: new Date("2026-03-01T10:00:00Z"),
      postUpdatedAt: new Date("2026-03-01T10:00:00Z"),
      author: { id: 1, firstName: "A", lastName: "B", email: "a@b.com", role: "STUDENT" },
    } as any);
    prismaMock.discussionPost.findMany.mockResolvedValueOnce([
      {
        id: 1,
        parentPostId: null,
        title: "Root",
        body: "Root",
        createdAt: new Date("2026-03-01T09:00:00Z"),
        updatedAt: new Date("2026-03-01T09:00:00Z"),
        author: { id: 1, firstName: "R", lastName: "O", email: "r@o.com", role: "STUDENT" },
      },
      {
        id: 3,
        parentPostId: 1,
        title: "Focus",
        body: "Focus",
        createdAt: new Date("2026-03-01T11:00:00Z"),
        updatedAt: new Date("2026-03-01T11:00:00Z"),
        author: { id: 2, firstName: "F", lastName: "C", email: "f@c.com", role: "STUDENT" },
      },
      {
        id: 4,
        parentPostId: 1,
        title: "Reply",
        body: "Reply",
        createdAt: new Date("2026-03-01T10:00:00Z"),
        updatedAt: new Date("2026-03-01T10:00:00Z"),
        author: { id: 3, firstName: "R", lastName: "P", email: "r@p.com", role: "STUDENT" },
      },
    ] as any);
    const res = mockResponse();

    await handler({ params: { id: "1" }, enterpriseUser: { enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } } as any, res);

    const payload = (res.json as any).mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({ focusPostId: 3, missingPost: false }));
    expect(payload.thread.id).toBe(1);
    expect(payload.thread.replies.map((item: any) => item.id)).toEqual([4, 3]);
  });

  it("returns 404 when dismiss report not found", async () => {
    const handler = findHandler("/forum-reports/:id", "delete");
    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
    prismaMock.forumReport.findFirst.mockResolvedValue(null);
    const res = mockResponse();
    await handler({ params: { id: "99" }, enterpriseUser: { enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("dismisses report and recreates missing discussion post", async () => {
    const handler = findHandler("/forum-reports/:id", "delete");
    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
    prismaMock.forumReport.findFirst.mockResolvedValueOnce({
      id: 7,
      projectId: 10,
      postId: 5,
      parentPostId: 99,
      authorId: 4,
      title: "T",
      body: "B",
      postCreatedAt: new Date("2026-03-01T10:00:00Z"),
      postUpdatedAt: new Date("2026-03-01T11:00:00Z"),
    } as any);
    prismaMock.discussionPost.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const res = mockResponse();

    await handler({ params: { id: "7" }, enterpriseUser: { enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } } as any, res);

    expect(prismaMock.discussionPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ parentPostId: null, authorId: 4, projectId: 10 }),
      }),
    );
    expect(prismaMock.forumReport.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("returns 400 for invalid dismiss report id", async () => {
    const handler = findHandler("/forum-reports/:id", "delete");
    const res = mockResponse();

    await handler({ params: { id: "abc" }, enterpriseUser: { enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } } as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid report id" });
  });

  it("returns 500 on unexpected dismiss errors", async () => {
    const handler = findHandler("/forum-reports/:id", "delete");
    prismaMock.$transaction.mockRejectedValueOnce(new Error("db down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = mockResponse();

    await handler({ params: { id: "1" }, enterpriseUser: { enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } } as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("removes report and post on remove endpoint", async () => {
    const handler = findHandler("/forum-reports/:id/remove", "delete");
    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
    prismaMock.forumReport.findFirst.mockResolvedValue({ id: 2, postId: 7, projectId: 3 } as any);
    const res = mockResponse();
    await handler({ params: { id: "2" }, enterpriseUser: { enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } }, res);
    expect(prismaMock.discussionPost.deleteMany).toHaveBeenCalledWith({ where: { id: 7, projectId: 3 } });
    expect(prismaMock.forumReport.delete).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("returns 400 for invalid remove report id", async () => {
    const handler = findHandler("/forum-reports/:id/remove", "delete");
    const res = mockResponse();

    await handler({ params: { id: "abc" }, enterpriseUser: { enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } } as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid report id" });
  });

  it("returns 404 when remove report is missing", async () => {
    const handler = findHandler("/forum-reports/:id/remove", "delete");
    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
    prismaMock.forumReport.findFirst.mockResolvedValueOnce(null);
    const res = mockResponse();

    await handler({ params: { id: "9" }, enterpriseUser: { enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } } as any, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Report not found" });
  });

  it("returns 500 on unexpected remove errors", async () => {
    const handler = findHandler("/forum-reports/:id/remove", "delete");
    prismaMock.$transaction.mockRejectedValueOnce(new Error("db down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = mockResponse();

    await handler({ params: { id: "1" }, enterpriseUser: { enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } } as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(errorSpy).toHaveBeenCalled();
  });
});
