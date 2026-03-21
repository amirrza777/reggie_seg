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

  it("returns 404 when dismiss report not found", async () => {
    const handler = findHandler("/forum-reports/:id", "delete");
    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
    prismaMock.forumReport.findFirst.mockResolvedValue(null);
    const res = mockResponse();
    await handler({ params: { id: "99" }, enterpriseUser: { enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
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
});
