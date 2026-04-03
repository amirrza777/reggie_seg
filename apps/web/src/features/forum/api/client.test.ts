import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/shared/api/http";
import {
  approveStudentForumReport,
  createDiscussionPost,
  createStudentForumReport,
  deleteDiscussionPost,
  getDiscussionPost,
  getDiscussionPosts,
  getForumMembers,
  getForumSettings,
  getStaffForumConversation,
  getStudentForumReports,
  ignoreStudentForumReport,
  reactToDiscussionPost,
  reportDiscussionPost,
  updateDiscussionPost,
  updateForumSettings,
} from "./client";

vi.mock("@/shared/api/http", () => ({
  apiFetch: vi.fn(),
}));

describe("forum api client", () => {
  const apiFetchMock = vi.mocked(apiFetch);

  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({} as never);
  });

  it("calls list/get/create/update/delete discussion post endpoints", async () => {
    await getDiscussionPosts(5, 9);
    await getDiscussionPost(5, 9, 12);
    await createDiscussionPost(5, 9, { title: "Topic", body: "Body", parentPostId: 3 });
    await updateDiscussionPost(5, 9, 12, { title: "New title", body: "New body" });
    await deleteDiscussionPost(5, 9, 12);

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/forum/projects/9/posts?userId=5", {
      cache: "no-store",
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/forum/projects/9/posts/12?userId=5");
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, "/forum/projects/9/posts", {
      method: "POST",
      body: JSON.stringify({ userId: 5, title: "Topic", body: "Body", parentPostId: 3 }),
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(4, "/forum/projects/9/posts/12", {
      method: "PUT",
      body: JSON.stringify({ userId: 5, title: "New title", body: "New body" }),
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(5, "/forum/projects/9/posts/12?userId=5", {
      method: "DELETE",
    });
  });

  it("calls reaction and reporting endpoints", async () => {
    await reportDiscussionPost(7, 11, 13, "Spam");
    await reactToDiscussionPost(7, 11, 13, "LIKE");
    await createStudentForumReport(7, 11, 13, "Off-topic");
    await getStudentForumReports(7, 11);
    await getStaffForumConversation(7, 11, 13);
    await approveStudentForumReport(7, 11, 22);
    await ignoreStudentForumReport(7, 11, 22);

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/forum/projects/11/posts/13/report", {
      method: "POST",
      body: JSON.stringify({ userId: 7, reason: "Spam" }),
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/forum/projects/11/posts/13/reactions", {
      method: "POST",
      body: JSON.stringify({ userId: 7, type: "LIKE" }),
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, "/forum/projects/11/posts/13/student-report", {
      method: "POST",
      body: JSON.stringify({ userId: 7, reason: "Off-topic" }),
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(4, "/forum/projects/11/student-reports?userId=7", {
      cache: "no-store",
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      5,
      "/forum/projects/11/posts/13/conversation?userId=7",
      { cache: "no-store" },
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(6, "/forum/projects/11/student-reports/22/approve", {
      method: "POST",
      body: JSON.stringify({ userId: 7 }),
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(7, "/forum/projects/11/student-reports/22/ignore", {
      method: "POST",
      body: JSON.stringify({ userId: 7 }),
    });
  });

  it("calls forum settings and member endpoints", async () => {
    await getForumSettings(8, 15);
    await updateForumSettings(8, 15, true);
    await getForumMembers(8, 15);

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/forum/projects/15/settings?userId=8", {
      cache: "no-store",
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/forum/projects/15/settings", {
      method: "PUT",
      body: JSON.stringify({ userId: 8, forumIsAnonymous: true }),
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, "/forum/projects/15/members?userId=8", {
      cache: "no-store",
    });
  });
});

