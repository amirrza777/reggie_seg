import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repo from "./repo.js";
import {
  fetchDiscussionPosts,
  createDiscussionPost,
  fetchDiscussionPost,
  updateDiscussionPost,
  deleteDiscussionPost,
  fetchForumSettings,
  setForumSettings,
  reportForumPost,
  reactToDiscussionPost,
  createStudentForumReport,
  fetchStudentForumReports,
  approveStudentForumReport,
  ignoreStudentForumReport,
  fetchStaffConversation,
} from "./service.js";

vi.mock("./repo.js", () => ({
  getDiscussionPostsForProject: vi.fn(),
  createDiscussionPostForProject: vi.fn(),
  getDiscussionPostById: vi.fn(),
  updateDiscussionPostForProject: vi.fn(),
  deleteDiscussionPostForProject: vi.fn(),
  getForumSettings: vi.fn(),
  updateForumSettings: vi.fn(),
  reportDiscussionPost: vi.fn(),
  setDiscussionPostReaction: vi.fn(),
  createStudentReport: vi.fn(),
  getStudentReportsForProject: vi.fn(),
  approveStudentReport: vi.fn(),
  ignoreStudentReport: vi.fn(),
  getStaffConversationForPost: vi.fn(),
}));

describe("forum service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetchDiscussionPosts proxies to repo", async () => {
    (repo.getDiscussionPostsForProject as any).mockResolvedValue([{ id: 1 }]);
    await expect(fetchDiscussionPosts(1, 2)).resolves.toEqual([{ id: 1 }]);
    expect(repo.getDiscussionPostsForProject).toHaveBeenCalledWith(1, 2);
  });

  it("createDiscussionPost proxies to repo", async () => {
    (repo.createDiscussionPostForProject as any).mockResolvedValue({ id: 2 });
    await expect(createDiscussionPost(1, 2, "t", "b", null)).resolves.toEqual({ id: 2 });
    expect(repo.createDiscussionPostForProject).toHaveBeenCalledWith(1, 2, "t", "b", null);
  });

  it("fetchDiscussionPost proxies to repo", async () => {
    (repo.getDiscussionPostById as any).mockResolvedValue({ id: 3 });
    await expect(fetchDiscussionPost(1, 2, 3)).resolves.toEqual({ id: 3 });
    expect(repo.getDiscussionPostById).toHaveBeenCalledWith(1, 2, 3);
  });

  it("updateDiscussionPost proxies to repo", async () => {
    (repo.updateDiscussionPostForProject as any).mockResolvedValue({ status: "ok" });
    await updateDiscussionPost(1, 2, 3, "t", "b");
    expect(repo.updateDiscussionPostForProject).toHaveBeenCalledWith(1, 2, 3, "t", "b");
  });

  it("deleteDiscussionPost proxies to repo", async () => {
    (repo.deleteDiscussionPostForProject as any).mockResolvedValue({ status: "ok" });
    await deleteDiscussionPost(1, 2, 3);
    expect(repo.deleteDiscussionPostForProject).toHaveBeenCalledWith(1, 2, 3);
  });

  it("fetchForumSettings proxies to repo", async () => {
    (repo.getForumSettings as any).mockResolvedValue({ forumIsAnonymous: true });
    await expect(fetchForumSettings(1, 2)).resolves.toEqual({ forumIsAnonymous: true });
  });

  it("setForumSettings proxies to repo", async () => {
    (repo.updateForumSettings as any).mockResolvedValue({ forumIsAnonymous: false });
    await expect(setForumSettings(1, 2, false)).resolves.toEqual({ forumIsAnonymous: false });
  });

  it("reportForumPost proxies to repo", async () => {
    (repo.reportDiscussionPost as any).mockResolvedValue({ status: "ok" });
    await reportForumPost(1, 2, 3, "reason");
    expect(repo.reportDiscussionPost).toHaveBeenCalledWith(1, 2, 3, "reason");
  });

  it("reactToDiscussionPost proxies to repo", async () => {
    (repo.setDiscussionPostReaction as any).mockResolvedValue({ status: "ok" });
    await reactToDiscussionPost(1, 2, 3, "LIKE");
    expect(repo.setDiscussionPostReaction).toHaveBeenCalledWith(1, 2, 3, "LIKE");
  });

  it("student report proxies to repo", async () => {
    (repo.createStudentReport as any).mockResolvedValue({ status: "ok" });
    await createStudentForumReport(1, 2, 3, "reason");
    expect(repo.createStudentReport).toHaveBeenCalledWith(1, 2, 3, "reason");
  });

  it("student report moderation proxies to repo", async () => {
    (repo.getStudentReportsForProject as any).mockResolvedValue([]);
    (repo.approveStudentReport as any).mockResolvedValue({ status: "ok" });
    (repo.ignoreStudentReport as any).mockResolvedValue({ status: "ok" });
    await fetchStudentForumReports(1, 2);
    await approveStudentForumReport(1, 2, 3);
    await ignoreStudentForumReport(1, 2, 3);
    expect(repo.getStudentReportsForProject).toHaveBeenCalledWith(1, 2);
    expect(repo.approveStudentReport).toHaveBeenCalledWith(1, 2, 3);
    expect(repo.ignoreStudentReport).toHaveBeenCalledWith(1, 2, 3);
  });

  it("fetchStaffConversation proxies to repo", async () => {
    (repo.getStaffConversationForPost as any).mockResolvedValue({ focusPostId: 1, thread: null, missingPost: true });
    await expect(fetchStaffConversation(1, 2, 3)).resolves.toEqual({
      focusPostId: 1,
      thread: null,
      missingPost: true,
    });
  });
});
