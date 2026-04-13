import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProjectDiscussionPostHandler,
  deleteProjectDiscussionPostHandler,
  getForumSettingsHandler,
  getProjectDiscussionPostHandler,
  getProjectDiscussionPostsHandler,
  mockResponse,
  service,
  updateForumSettingsHandler,
  updateProjectDiscussionPostHandler,
} from "./controller.shared-test-helpers.js";

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
    (service.fetchDiscussionPost as any).mockResolvedValue({ id: 4, parentPostId: null, title: "original", body: "orig body" });
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

  it("returns 500 when fetching discussion posts throws", async () => {
    (service.fetchDiscussionPosts as any).mockRejectedValue(new Error("boom"));
    const res = mockResponse();
    await getProjectDiscussionPostsHandler({ query: { userId: "1" }, params: { projectId: "2" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 403 when create post is forbidden", async () => {
    (service.createDiscussionPost as any).mockResolvedValue(null);
    const res = mockResponse();
    await createProjectDiscussionPostHandler(
      { params: { projectId: "1" }, body: { userId: 1, title: "Hi", body: "Body" } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 500 when create post throws", async () => {
    (service.createDiscussionPost as any).mockRejectedValue(new Error("boom"));
    const res = mockResponse();
    await createProjectDiscussionPostHandler(
      { params: { projectId: "1" }, body: { userId: 1, title: "Hi", body: "Body" } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 500 when get post throws", async () => {
    (service.fetchDiscussionPost as any).mockRejectedValue(new Error("boom"));
    const res = mockResponse();
    await getProjectDiscussionPostHandler({ params: { projectId: "1", postId: "9" }, query: { userId: "1" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 403 and 404 from update post result status", async () => {
    (service.fetchDiscussionPost as any).mockResolvedValue({ id: 4, parentPostId: null, title: "original", body: "orig body" });
    (service.updateDiscussionPost as any).mockResolvedValueOnce({ status: "forbidden" });
    const res1 = mockResponse();
    await updateProjectDiscussionPostHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1, title: "t", body: "b" } } as any,
      res1,
    );
    expect(res1.status).toHaveBeenCalledWith(403);

    (service.updateDiscussionPost as any).mockResolvedValueOnce({ status: "not_found" });
    const res2 = mockResponse();
    await updateProjectDiscussionPostHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1, title: "t", body: "b" } } as any,
      res2,
    );
    expect(res2.status).toHaveBeenCalledWith(404);
  });

  it("returns 500 when update post throws", async () => {
    (service.fetchDiscussionPost as any).mockResolvedValue({ id: 4, parentPostId: null, title: "original", body: "orig body" });
    (service.updateDiscussionPost as any).mockRejectedValue(new Error("boom"));
    const res = mockResponse();
    await updateProjectDiscussionPostHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1, title: "t", body: "b" } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 403 and 404 from delete post result status", async () => {
    (service.deleteDiscussionPost as any).mockResolvedValueOnce({ status: "forbidden" });
    const res1 = mockResponse();
    await deleteProjectDiscussionPostHandler(
      { params: { projectId: "1", postId: "4" }, query: { userId: "1" } } as any,
      res1,
    );
    expect(res1.status).toHaveBeenCalledWith(403);

    (service.deleteDiscussionPost as any).mockResolvedValueOnce({ status: "not_found" });
    const res2 = mockResponse();
    await deleteProjectDiscussionPostHandler(
      { params: { projectId: "1", postId: "4" }, query: { userId: "1" } } as any,
      res2,
    );
    expect(res2.status).toHaveBeenCalledWith(404);
  });

  it("returns 500 when delete post throws", async () => {
    (service.deleteDiscussionPost as any).mockRejectedValue(new Error("boom"));
    const res = mockResponse();
    await deleteProjectDiscussionPostHandler(
      { params: { projectId: "1", postId: "4" }, query: { userId: "1" } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 403 and 500 for forum settings read", async () => {
    (service.fetchForumSettings as any).mockResolvedValueOnce(null);
    const res1 = mockResponse();
    await getForumSettingsHandler({ params: { projectId: "1" }, query: { userId: "2" } } as any, res1);
    expect(res1.status).toHaveBeenCalledWith(403);

    (service.fetchForumSettings as any).mockRejectedValueOnce(new Error("boom"));
    const res2 = mockResponse();
    await getForumSettingsHandler({ params: { projectId: "1" }, query: { userId: "2" } } as any, res2);
    expect(res2.status).toHaveBeenCalledWith(500);
  });

  it("returns 403 and 500 for forum settings update", async () => {
    (service.setForumSettings as any).mockResolvedValueOnce(null);
    const res1 = mockResponse();
    await updateForumSettingsHandler(
      { params: { projectId: "1" }, body: { userId: 2, forumIsAnonymous: false } } as any,
      res1,
    );
    expect(res1.status).toHaveBeenCalledWith(403);

    (service.setForumSettings as any).mockRejectedValueOnce(new Error("boom"));
    const res2 = mockResponse();
    await updateForumSettingsHandler(
      { params: { projectId: "1" }, body: { userId: 2, forumIsAnonymous: false } } as any,
      res2,
    );
    expect(res2.status).toHaveBeenCalledWith(500);
  });
});
