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
  getDiscussionPostAuthorId: vi.fn(),
  getModuleLeadsForProject: vi.fn(),
  getUserRole: vi.fn(),
  getUserById: vi.fn(),
  getProjectMembers: vi.fn(),
}));

vi.mock("../notifications/service.js", () => ({
  addNotification: vi.fn(),
}));

import * as notificationsService from "../notifications/service.js";

describe("forum service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (repo.getProjectMembers as any).mockResolvedValue([]);
    (repo.getUserRole as any).mockResolvedValue("STUDENT");
    (repo.getUserById as any).mockResolvedValue({ id: 5, firstName: "Test", lastName: "User", role: "STUDENT" });
  });

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
    (repo.getModuleLeadsForProject as any).mockResolvedValue([]);
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

  it("sends student link when parent post author is a student", async () => {
    (repo.getDiscussionPostAuthorId as any).mockResolvedValue(7);
    (repo.getUserRole as any).mockResolvedValue("STUDENT");
    (repo.createDiscussionPostForProject as any).mockResolvedValue({ id: 10 });

    await createDiscussionPost(5, 2, "Re: topic", "body", 3);

    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7, type: "FORUM_REPLY", link: "/projects/2/discussion" })
    );
  });

  it("sends staff link when parent post author is staff", async () => {
    (repo.getDiscussionPostAuthorId as any).mockResolvedValue(7);
    (repo.getUserRole as any).mockResolvedValue("STAFF");
    (repo.createDiscussionPostForProject as any).mockResolvedValue({ id: 10 });

    await createDiscussionPost(5, 2, "Re: topic", "body", 3);

    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7, type: "FORUM_REPLY", link: "/staff/projects/2/discussion" })
    );
  });

  it("does not notify when replier is the parent post author", async () => {
    (repo.getDiscussionPostAuthorId as any).mockResolvedValue(5);
    (repo.createDiscussionPostForProject as any).mockResolvedValue({ id: 10 });

    await createDiscussionPost(5, 2, "Re: topic", "body", 3);

    expect(notificationsService.addNotification).not.toHaveBeenCalled();
  });

  it("does not notify on a top-level post", async () => {
    (repo.createDiscussionPostForProject as any).mockResolvedValue({ id: 11 });

    await createDiscussionPost(5, 2, "New topic", "body", null);

    expect(repo.getDiscussionPostAuthorId).not.toHaveBeenCalled();
    expect(notificationsService.addNotification).not.toHaveBeenCalled();
  });

  it("notifies module leads when a post is reported", async () => {
    (repo.createStudentReport as any).mockResolvedValue({ status: "ok" });
    (repo.getModuleLeadsForProject as any).mockResolvedValue([{ userId: 10 }, { userId: 11 }]);

    await createStudentForumReport(1, 2, 3);

    expect(notificationsService.addNotification).toHaveBeenCalledTimes(2);
    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 10, type: "FORUM_REPORTED" })
    );
    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 11, type: "FORUM_REPORTED" })
    );
  });

  it("does not notify module leads when report is not created successfully", async () => {
    (repo.createStudentReport as any).mockResolvedValue({ status: "duplicate" });

    await createStudentForumReport(1, 2, 3);

    expect(notificationsService.addNotification).not.toHaveBeenCalled();
  });

  describe("createDiscussionPost mention notifications", () => {
    const mentionBody = JSON.stringify({
      root: { children: [{ type: "mention", mentionName: "Reggie King" }] },
    });

    it("sends MENTION notification to mentioned member", async () => {
      (repo.createDiscussionPostForProject as any).mockResolvedValue({ id: 1 });
      (repo.getProjectMembers as any).mockResolvedValue([
        { id: 10, firstName: "Reggie", lastName: "King" },
      ]);

      await createDiscussionPost(5, 2, "title", mentionBody, null);

      expect(notificationsService.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 10, type: "MENTION" })
      );
    });

    it("does not notify the author if they mention themselves", async () => {
      (repo.createDiscussionPostForProject as any).mockResolvedValue({ id: 1 });
      (repo.getProjectMembers as any).mockResolvedValue([
        { id: 5, firstName: "Reggie", lastName: "King" },
      ]);

      await createDiscussionPost(5, 2, "title", mentionBody, null);

      expect(notificationsService.addNotification).not.toHaveBeenCalledWith(
        expect.objectContaining({ userId: 5, type: "MENTION" })
      );
    });

    it("always uses student link regardless of author role", async () => {
      (repo.createDiscussionPostForProject as any).mockResolvedValue({ id: 1 });
      (repo.getUserById as any).mockResolvedValue({ id: 5, firstName: "Test", lastName: "User", role: "STAFF" });
      (repo.getProjectMembers as any).mockResolvedValue([
        { id: 10, firstName: "Reggie", lastName: "King" },
      ]);

      await createDiscussionPost(5, 2, "title", mentionBody, null);

      expect(notificationsService.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ link: "/projects/2/discussion" })
      );
    });

    it("includes the author name in the notification message", async () => {
      (repo.createDiscussionPostForProject as any).mockResolvedValue({ id: 1 });
      (repo.getUserById as any).mockResolvedValue({ id: 5, firstName: "Alice", lastName: "Smith", role: "STAFF" });
      (repo.getProjectMembers as any).mockResolvedValue([
        { id: 10, firstName: "Reggie", lastName: "King" },
      ]);

      await createDiscussionPost(5, 2, "title", mentionBody, null);

      expect(notificationsService.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Alice Smith mentioned you in a discussion post" })
      );
    });

    it("sends no MENTION notification when body has no mentions", async () => {
      (repo.createDiscussionPostForProject as any).mockResolvedValue({ id: 1 });

      await createDiscussionPost(5, 2, "title", "plain text body", null);

      expect(repo.getProjectMembers).not.toHaveBeenCalled();
    });
  });
});
