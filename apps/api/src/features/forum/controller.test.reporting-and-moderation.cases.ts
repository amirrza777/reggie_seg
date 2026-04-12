import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveStudentForumReportHandler,
  createStudentForumReportHandler,
  getForumMembersHandler,
  getStaffConversationHandler,
  getStudentForumReportsHandler,
  ignoreStudentForumReportHandler,
  mockResponse,
  reactToDiscussionPostHandler,
  reportDiscussionPostHandler,
  service,
} from "./controller.test.shared.js";

describe("forum controller", () => {
  beforeEach(() => vi.clearAllMocks());

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

  it("maps report and reaction statuses", async () => {
    (service.reportForumPost as any).mockResolvedValueOnce({ status: "forbidden" });
    const reportForbidden = mockResponse();
    await reportDiscussionPostHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1, reason: "x" } } as any,
      reportForbidden,
    );
    expect(reportForbidden.status).toHaveBeenCalledWith(403);

    (service.reportForumPost as any).mockResolvedValueOnce({ status: "not_found" });
    const reportNotFound = mockResponse();
    await reportDiscussionPostHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1, reason: "x" } } as any,
      reportNotFound,
    );
    expect(reportNotFound.status).toHaveBeenCalledWith(404);

    (service.reactToDiscussionPost as any).mockResolvedValueOnce({ status: "forbidden" });
    const reactForbidden = mockResponse();
    await reactToDiscussionPostHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1, type: "LIKE" } } as any,
      reactForbidden,
    );
    expect(reactForbidden.status).toHaveBeenCalledWith(403);

    (service.reactToDiscussionPost as any).mockResolvedValueOnce({ status: "not_found" });
    const reactNotFound = mockResponse();
    await reactToDiscussionPostHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1, type: "LIKE" } } as any,
      reactNotFound,
    );
    expect(reactNotFound.status).toHaveBeenCalledWith(404);
  });

  it("returns 500 when report or reaction update throws", async () => {
    (service.reportForumPost as any).mockRejectedValueOnce(new Error("boom"));
    const reportErr = mockResponse();
    await reportDiscussionPostHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1, reason: "x" } } as any,
      reportErr,
    );
    expect(reportErr.status).toHaveBeenCalledWith(500);

    (service.reactToDiscussionPost as any).mockRejectedValueOnce(new Error("boom"));
    const reactErr = mockResponse();
    await reactToDiscussionPostHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1, type: "LIKE" } } as any,
      reactErr,
    );
    expect(reactErr.status).toHaveBeenCalledWith(500);
  });

  it("maps student report statuses and errors", async () => {
    (service.createStudentForumReport as any).mockResolvedValueOnce({ status: "forbidden" });
    const forbidden = mockResponse();
    await createStudentForumReportHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1 } } as any,
      forbidden,
    );
    expect(forbidden.status).toHaveBeenCalledWith(403);

    (service.createStudentForumReport as any).mockResolvedValueOnce({ status: "not_found" });
    const notFound = mockResponse();
    await createStudentForumReportHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1 } } as any,
      notFound,
    );
    expect(notFound.status).toHaveBeenCalledWith(404);

    (service.createStudentForumReport as any).mockResolvedValueOnce({ status: "already_reported" });
    const already = mockResponse();
    await createStudentForumReportHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1 } } as any,
      already,
    );
    expect(already.status).toHaveBeenCalledWith(409);

    (service.createStudentForumReport as any).mockResolvedValueOnce({ status: "ok" });
    const okRes = mockResponse();
    await createStudentForumReportHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1 } } as any,
      okRes,
    );
    expect(okRes.json).toHaveBeenCalledWith({ ok: true });

    (service.createStudentForumReport as any).mockRejectedValueOnce(new Error("boom"));
    const errRes = mockResponse();
    await createStudentForumReportHandler(
      { params: { projectId: "1", postId: "4" }, body: { userId: 1 } } as any,
      errRes,
    );
    expect(errRes.status).toHaveBeenCalledWith(500);
  });

  it("covers student report lists and moderation error/forbidden paths", async () => {
    (service.fetchStudentForumReports as any).mockResolvedValueOnce([{ id: 1 }]);
    const okReports = mockResponse();
    await getStudentForumReportsHandler({ params: { projectId: "1" }, query: { userId: "1" } } as any, okReports);
    expect(okReports.json).toHaveBeenCalledWith([{ id: 1 }]);

    (service.fetchStudentForumReports as any).mockRejectedValueOnce(new Error("boom"));
    const errReports = mockResponse();
    await getStudentForumReportsHandler({ params: { projectId: "1" }, query: { userId: "1" } } as any, errReports);
    expect(errReports.status).toHaveBeenCalledWith(500);

    (service.approveStudentForumReport as any).mockResolvedValueOnce({ status: "forbidden" });
    const approveForbidden = mockResponse();
    await approveStudentForumReportHandler(
      { params: { projectId: "1", reportId: "3" }, body: { userId: 1 } } as any,
      approveForbidden,
    );
    expect(approveForbidden.status).toHaveBeenCalledWith(403);

    (service.approveStudentForumReport as any).mockResolvedValueOnce({ status: "not_found" });
    const approveNotFound = mockResponse();
    await approveStudentForumReportHandler(
      { params: { projectId: "1", reportId: "3" }, body: { userId: 1 } } as any,
      approveNotFound,
    );
    expect(approveNotFound.status).toHaveBeenCalledWith(404);

    (service.approveStudentForumReport as any).mockRejectedValueOnce(new Error("boom"));
    const approveErr = mockResponse();
    await approveStudentForumReportHandler(
      { params: { projectId: "1", reportId: "3" }, body: { userId: 1 } } as any,
      approveErr,
    );
    expect(approveErr.status).toHaveBeenCalledWith(500);

    (service.ignoreStudentForumReport as any).mockResolvedValueOnce({ status: "forbidden" });
    const ignoreForbidden = mockResponse();
    await ignoreStudentForumReportHandler(
      { params: { projectId: "1", reportId: "3" }, body: { userId: 1 } } as any,
      ignoreForbidden,
    );
    expect(ignoreForbidden.status).toHaveBeenCalledWith(403);

    (service.ignoreStudentForumReport as any).mockResolvedValueOnce({ status: "not_found" });
    const ignoreNotFound = mockResponse();
    await ignoreStudentForumReportHandler(
      { params: { projectId: "1", reportId: "3" }, body: { userId: 1 } } as any,
      ignoreNotFound,
    );
    expect(ignoreNotFound.status).toHaveBeenCalledWith(404);

    (service.ignoreStudentForumReport as any).mockRejectedValueOnce(new Error("boom"));
    const ignoreErr = mockResponse();
    await ignoreStudentForumReportHandler(
      { params: { projectId: "1", reportId: "3" }, body: { userId: 1 } } as any,
      ignoreErr,
    );
    expect(ignoreErr.status).toHaveBeenCalledWith(500);
  });

  it("covers staff conversation and members handlers", async () => {
    (service.fetchStaffConversation as any).mockResolvedValueOnce({ focusPostId: 1, thread: null, missingPost: true });
    const okConversation = mockResponse();
    await getStaffConversationHandler(
      { params: { projectId: "1", postId: "3" }, query: { userId: "1" } } as any,
      okConversation,
    );
    expect(okConversation.json).toHaveBeenCalledWith({ focusPostId: 1, thread: null, missingPost: true });

    (service.fetchStaffConversation as any).mockRejectedValueOnce(new Error("boom"));
    const errConversation = mockResponse();
    await getStaffConversationHandler(
      { params: { projectId: "1", postId: "3" }, query: { userId: "1" } } as any,
      errConversation,
    );
    expect(errConversation.status).toHaveBeenCalledWith(500);

    const invalidMembers = mockResponse();
    await getForumMembersHandler({ params: { projectId: "1" }, query: { userId: "x" } } as any, invalidMembers);
    expect(invalidMembers.status).toHaveBeenCalledWith(400);

    (service.fetchForumMembers as any).mockResolvedValueOnce(null);
    const forbiddenMembers = mockResponse();
    await getForumMembersHandler({ params: { projectId: "1" }, query: { userId: "1" } } as any, forbiddenMembers);
    expect(forbiddenMembers.status).toHaveBeenCalledWith(403);

    (service.fetchForumMembers as any).mockResolvedValueOnce([{ id: 1 }]);
    const okMembers = mockResponse();
    await getForumMembersHandler({ params: { projectId: "1" }, query: { userId: "1" } } as any, okMembers);
    expect(okMembers.json).toHaveBeenCalledWith([{ id: 1 }]);

    (service.fetchForumMembers as any).mockRejectedValueOnce(new Error("boom"));
    const errMembers = mockResponse();
    await getForumMembersHandler({ params: { projectId: "1" }, query: { userId: "1" } } as any, errMembers);
    expect(errMembers.status).toHaveBeenCalledWith(500);
  });
});
