import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import { addCommentHandler, deleteCommentHandler } from "./controller.js";

vi.mock("./service.js", () => ({
  addComment: vi.fn(),
  removeComment: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("addCommentHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid meeting id", async () => {
    const req: any = { params: { meetingId: "abc" }, body: {} };
    const res = mockResponse();
    await addCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when required fields are missing", async () => {
    const req: any = { params: { meetingId: "1" }, body: { userId: 1 } };
    const res = mockResponse();
    await addCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("creates comment and returns 201", async () => {
    (service.addComment as any).mockResolvedValue({ id: 10 });
    const req: any = {
      params: { meetingId: "5" },
      body: { userId: 1, content: "looks good" },
    };
    const res = mockResponse();
    await addCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 10 });
  });

  it("returns 409 when project is archived", async () => {
    (service.addComment as any).mockRejectedValue({ code: "PROJECT_ARCHIVED" });
    const req: any = {
      params: { meetingId: "5" },
      body: { userId: 1, content: "looks good" },
    };
    const res = mockResponse();
    await addCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("returns 404 when meeting not found", async () => {
    (service.addComment as any).mockRejectedValue({ code: "NOT_FOUND" });
    const req: any = {
      params: { meetingId: "5" },
      body: { userId: 1, content: "looks good" },
    };
    const res = mockResponse();
    await addCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 500 on error", async () => {
    (service.addComment as any).mockRejectedValue(new Error("fail"));
    const req: any = {
      params: { meetingId: "5" },
      body: { userId: 1, content: "looks good" },
    };
    const res = mockResponse();
    await addCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("deleteCommentHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid comment id", async () => {
    const req: any = { params: { commentId: "abc" } };
    const res = mockResponse();
    await deleteCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns ok on success", async () => {
    (service.removeComment as any).mockResolvedValue(undefined);
    const req: any = { params: { commentId: "12" } };
    const res = mockResponse();
    await deleteCommentHandler(req, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("returns 404 for P2025 error", async () => {
    (service.removeComment as any).mockRejectedValue({ code: "P2025" });
    const req: any = { params: { commentId: "12" } };
    const res = mockResponse();
    await deleteCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 409 when project is archived", async () => {
    (service.removeComment as any).mockRejectedValue({ code: "PROJECT_ARCHIVED" });
    const req: any = { params: { commentId: "12" } };
    const res = mockResponse();
    await deleteCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("returns 500 for other errors", async () => {
    (service.removeComment as any).mockRejectedValue(new Error("fail"));
    const req: any = { params: { commentId: "12" } };
    const res = mockResponse();
    await deleteCommentHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
