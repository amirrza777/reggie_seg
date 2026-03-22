import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  getProjectDiscussionPostsHandler,
  createProjectDiscussionPostHandler,
  getProjectDiscussionPostHandler,
  updateProjectDiscussionPostHandler,
  deleteProjectDiscussionPostHandler,
  getForumSettingsHandler,
  updateForumSettingsHandler,
  reportDiscussionPostHandler,
  reactToDiscussionPostHandler,
  createStudentForumReportHandler,
  getStudentForumReportsHandler,
  approveStudentForumReportHandler,
  ignoreStudentForumReportHandler,
  getStaffConversationHandler,
} from "./controller.js";

vi.mock("./service.js", () => ({
  fetchDiscussionPosts: vi.fn(),
  fetchDiscussionPost: vi.fn(),
  createDiscussionPost: vi.fn(),
  updateDiscussionPost: vi.fn(),
  deleteDiscussionPost: vi.fn(),
  reportForumPost: vi.fn(),
  reactToDiscussionPost: vi.fn(),
  createStudentForumReport: vi.fn(),
  fetchStudentForumReports: vi.fn(),
  approveStudentForumReport: vi.fn(),
  ignoreStudentForumReport: vi.fn(),
  fetchStaffConversation: vi.fn(),
  fetchForumSettings: vi.fn(),
  setForumSettings: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("forum controller", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid discussion posts params", async () => {
    const res = mockResponse();
    await getProjectDiscussionPostsHandler({ query: { userId: "x" }, params: { projectId: "1" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 403 when posts are forbidden", async () => {
    (service.fetchDiscussionPosts as any).mockResolvedValue(null);
    const res = mockResponse();
    await getProjectDiscussionPostsHandler({ query: { userId: "1" }, params: { projectId: "2" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns posts on success", async () => {
    (service.fetchDiscussionPosts as any).mockResolvedValue([{ id: 1 }]);
    const res = mockResponse();
    await getProjectDiscussionPostsHandler({ query: { userId: "1" }, params: { projectId: "2" } } as any, res);
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it("returns 400 for invalid create post payload", async () => {
    const res = mockResponse();
    await createProjectDiscussionPostHandler(
      { params: { projectId: "1" }, body: { userId: 1, title: "", body: "" } } as any,
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 201 on create success", async () => {
    (service.createDiscussionPost as any).mockResolvedValue({ id: 1 });
    const res = mockResponse();
    await createProjectDiscussionPostHandler(
      { params: { projectId: "1" }, body: { userId: 1, title: "Hi", body: "Body" } } as any,
      res
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("returns 404 when get post missing", async () => {
    (service.fetchDiscussionPost as any).mockResolvedValue(null);
    const res = mockResponse();
    await getProjectDiscussionPostHandler({ params: { projectId: "1", postId: "9" }, query: { userId: "1" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("updates post and returns it", async () => {
    (service.updateDiscussionPost as any).mockResolvedValue({ status: "ok", post: { id: 4 } });
    const res = mockResponse();
    await updateProjectDiscussionPostHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1, title: "t", body: "b" } } as any,
      res
    );
    expect(res.json).toHaveBeenCalledWith({ id: 4 });
  });

  it("deletes post and returns ok", async () => {
    (service.deleteDiscussionPost as any).mockResolvedValue({ status: "ok" });
    const res = mockResponse();
    await deleteProjectDiscussionPostHandler(
      { params: { projectId: "1", postId: "4" }, query: { userId: "1" } } as any,
      res
    );
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("reports post and returns ok", async () => {
    (service.reportForumPost as any).mockResolvedValue({ status: "ok" });
    const res = mockResponse();
    await reportDiscussionPostHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1, reason: "x" } } as any,
      res
    );
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("reacts to post and returns updated post", async () => {
    (service.reactToDiscussionPost as any).mockResolvedValue({ status: "ok", post: { id: 4 } });
    const res = mockResponse();
    await reactToDiscussionPostHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1, type: "LIKE" } } as any,
      res
    );
    expect(res.json).toHaveBeenCalledWith({ id: 4 });
  });

  it("returns forum settings for staff", async () => {
    (service.fetchForumSettings as any).mockResolvedValue({ forumIsAnonymous: true });
    const res = mockResponse();
    await getForumSettingsHandler({ params: { projectId: "1" }, query: { userId: "2" } } as any, res);
    expect(res.json).toHaveBeenCalledWith({ forumIsAnonymous: true });
  });

  it("updates forum settings for staff", async () => {
    (service.setForumSettings as any).mockResolvedValue({ forumIsAnonymous: false });
    const res = mockResponse();
    await updateForumSettingsHandler(
      { params: { projectId: "1" }, body: { userId: 2, forumIsAnonymous: false } } as any,
      res
    );
    expect(res.json).toHaveBeenCalledWith({ forumIsAnonymous: false });
  });

  it("student report maps duplicate to 409", async () => {
    (service.createStudentForumReport as any).mockResolvedValue({ status: "duplicate" });
    const res = mockResponse();
    await createStudentForumReportHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1 } } as any,
      res
    );
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("student reports list returns 403 when forbidden", async () => {
    (service.fetchStudentForumReports as any).mockResolvedValue(null);
    const res = mockResponse();
    await getStudentForumReportsHandler({ params: { projectId: "1" }, query: { userId: "1" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("student report approval returns ok", async () => {
    (service.approveStudentForumReport as any).mockResolvedValue({ status: "ok" });
    const res = mockResponse();
    await approveStudentForumReportHandler(
      { params: { projectId: "1", reportId: "3" }, body: { userId: 1 } } as any,
      res
    );
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("student report ignore returns ok", async () => {
    (service.ignoreStudentForumReport as any).mockResolvedValue({ status: "ok" });
    const res = mockResponse();
    await ignoreStudentForumReportHandler(
      { params: { projectId: "1", reportId: "3" }, body: { userId: 1 } } as any,
      res
    );
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("staff conversation handler returns 403 when forbidden", async () => {
    (service.fetchStaffConversation as any).mockResolvedValue(null);
    const res = mockResponse();
    await getStaffConversationHandler({ params: { projectId: "1", postId: "3" }, query: { userId: "1" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
