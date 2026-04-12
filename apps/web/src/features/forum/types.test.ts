import { describe, expect, it } from "vitest";
import type * as forumTypes from "./types";

describe("forum/types", () => {
  it("exports DiscussionPost type", () => {
    // Type-only test: verifies the module can be imported and types exist
    const testValue: forumTypes.DiscussionPost = {
      id: 1,
      parentPostId: null,
      title: "Test",
      body: "Body",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      reactionScore: 0,
      myReaction: null,
      author: {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        role: "STUDENT",
      },
      replies: [],
    };
    expect(testValue.id).toBe(1);
    expect(testValue.title).toBe("Test");
  });

  it("exports StudentForumReportEntry type", () => {
    const testValue: forumTypes.StudentForumReportEntry = {
      id: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      reason: null,
      reportCount: 1,
      post: {
        id: 1,
        title: "Test",
        body: "Body",
        createdAt: "2026-01-01T00:00:00.000Z",
        author: {
          id: 1,
          firstName: "John",
          lastName: "Doe",
          role: "STUDENT",
        },
      },
      reporter: {
        id: 2,
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        role: "STUDENT",
      },
    };
    expect(testValue.id).toBe(1);
    expect(testValue.reportCount).toBe(1);
  });

  it("exports ForumConversationPost type", () => {
    const testValue: forumTypes.ForumConversationPost = {
      id: 1,
      parentPostId: null,
      title: "Test",
      body: "Body",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      author: {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        role: "STAFF",
      },
      replies: [],
    };
    expect(testValue.id).toBe(1);
    expect(testValue.title).toBe("Test");
  });

  it("exports ForumPostConversation type", () => {
    const testValue: forumTypes.ForumPostConversation = {
      focusPostId: 1,
      thread: null,
      missingPost: false,
    };
    expect(testValue.focusPostId).toBe(1);
    expect(testValue.missingPost).toBe(false);
  });

  it("exports ForumSettings type", () => {
    const testValue: forumTypes.ForumSettings = {
      forumIsAnonymous: false,
    };
    expect(testValue.forumIsAnonymous).toBe(false);
  });

  it("supports DiscussionPost with optional forumRole", () => {
    const testValue: forumTypes.DiscussionPost = {
      id: 1,
      parentPostId: null,
      title: "Test",
      body: "Body",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      reactionScore: 0,
      myReaction: null,
      author: {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        role: "STAFF",
        forumRole: "MODULE_LEAD",
      },
      replies: [],
    };
    expect(testValue.author.forumRole).toBe("MODULE_LEAD");
  });

  it("supports DiscussionPost with myStudentReportStatus", () => {
    const testValue: forumTypes.DiscussionPost = {
      id: 1,
      parentPostId: null,
      title: "Test",
      body: "Body",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      reactionScore: 0,
      myReaction: "LIKE",
      myStudentReportStatus: "PENDING",
      author: {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        role: "STUDENT",
      },
      replies: [],
    };
    expect(testValue.myStudentReportStatus).toBe("PENDING");
  });
});
