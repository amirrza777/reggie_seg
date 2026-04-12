import { describe, expect, it } from "vitest";
import type { DiscussionPost } from "@/features/forum/types";
import {
  addReplyToTree,
  removePostFromTree,
  updatePostInTree,
  updateReportStatusInTree,
} from "./DiscussionForumClient.tree";

describe("DiscussionForumClient.tree - Tree Mutations", () => {
  describe("addReplyToTree", () => {
    const createPost = (id: number, reactionScore: number = 0): DiscussionPost => ({
      id,
      parentPostId: null,
      title: "Test",
      body: "Body",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      reactionScore,
      myReaction: null,
      author: {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        role: "STUDENT",
      },
      replies: [],
    });

    it("adds reply to root post", () => {
      const posts: DiscussionPost[] = [createPost(1)];
      const reply = { ...createPost(2), parentPostId: 1 };

      const result = addReplyToTree(posts, 1, reply);
      expect(result[0].replies).toHaveLength(1);
      expect(result[0].replies[0].id).toBe(2);
    });

    it("adds reply to nested post", () => {
      const posts: DiscussionPost[] = [
        {
          ...createPost(1),
          replies: [{ ...createPost(2), parentPostId: 1 }],
        },
      ];
      const reply = { ...createPost(3), parentPostId: 2 };

      const result = addReplyToTree(posts, 2, reply);
      expect(result[0].replies[0].replies).toHaveLength(1);
      expect(result[0].replies[0].replies[0].id).toBe(3);
    });

    it("sorts replies after adding", () => {
      const posts: DiscussionPost[] = [
        {
          ...createPost(1),
          replies: [
            { ...createPost(2, 5), parentPostId: 1 },
            { ...createPost(3, 2), parentPostId: 1 },
          ],
        },
      ];
      const reply = { ...createPost(4, 10), parentPostId: 1 };

      const result = addReplyToTree(posts, 1, reply);
      expect(result[0].replies.map((r) => r.id)).toEqual([4, 2, 3]);
    });
  });

  describe("updatePostInTree", () => {
    const createPost = (id: number): DiscussionPost => ({
      id,
      parentPostId: null,
      title: "Original",
      body: "Original body",
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
    });

    it("updates root post", () => {
      const posts: DiscussionPost[] = [createPost(1)];
      const updated = { ...createPost(1), title: "Updated" };

      const result = updatePostInTree(posts, updated);
      expect(result[0].title).toBe("Updated");
    });

    it("updates nested post", () => {
      const posts: DiscussionPost[] = [
        {
          ...createPost(1),
          replies: [{ ...createPost(2), parentPostId: 1 }],
        },
      ];
      const updated = { ...createPost(2), title: "Updated", reactionScore: 5 };

      const result = updatePostInTree(posts, updated);
      expect(result[0].replies[0].title).toBe("Updated");
      expect(result[0].replies[0].reactionScore).toBe(5);
    });

    it("replaces entire post with updated post including replies", () => {
      const post2 = { ...createPost(2), parentPostId: 1, reactionScore: 5 };
      const post3 = { ...createPost(3), parentPostId: 1, reactionScore: 2 };
      const posts: DiscussionPost[] = [
        {
          ...createPost(1),
          replies: [post2, post3],
        },
      ];
      const updatedWithReplies = { ...createPost(1), title: "Updated", replies: [post2] };

      const result = updatePostInTree(posts, updatedWithReplies);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Updated");
      expect(result[0].replies).toHaveLength(1);
      expect(result[0].replies[0].id).toBe(2);
    });
  });

  describe("updateReportStatusInTree", () => {
    const createPost = (id: number): DiscussionPost => ({
      id,
      parentPostId: null,
      title: "Test",
      body: "Body",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      reactionScore: 0,
      myReaction: null,
      myStudentReportStatus: null,
      author: {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        role: "STUDENT",
      },
      replies: [],
    });

    it("updates report status on root post", () => {
      const posts: DiscussionPost[] = [createPost(1)];
      const result = updateReportStatusInTree(posts, 1, "PENDING");
      expect(result[0].myStudentReportStatus).toBe("PENDING");
    });

    it("updates report status on nested post", () => {
      const posts: DiscussionPost[] = [
        {
          ...createPost(1),
          replies: [{ ...createPost(2), parentPostId: 1 }],
        },
      ];
      const result = updateReportStatusInTree(posts, 2, "APPROVED");
      expect(result[0].replies[0].myStudentReportStatus).toBe("APPROVED");
    });

    it("converts undefined to null", () => {
      const posts: DiscussionPost[] = [createPost(1)];
      const result = updateReportStatusInTree(posts, 1, undefined);
      expect(result[0].myStudentReportStatus).toBeNull();
    });
  });

  describe("removePostFromTree", () => {
    const createPost = (id: number): DiscussionPost => ({
      id,
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
    });

    it("removes root post", () => {
      const posts: DiscussionPost[] = [createPost(1), createPost(2)];
      const result = removePostFromTree(posts, 1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it("removes nested post", () => {
      const posts: DiscussionPost[] = [
        {
          ...createPost(1),
          replies: [
            { ...createPost(2), parentPostId: 1 },
            { ...createPost(3), parentPostId: 1 },
          ],
        },
      ];
      const result = removePostFromTree(posts, 2);
      expect(result[0].replies).toHaveLength(1);
      expect(result[0].replies[0].id).toBe(3);
    });

    it("removes deeply nested post", () => {
      const posts: DiscussionPost[] = [
        {
          ...createPost(1),
          replies: [
            {
              ...createPost(2),
              parentPostId: 1,
              replies: [{ ...createPost(3), parentPostId: 2 }],
            },
          ],
        },
      ];
      const result = removePostFromTree(posts, 3);
      expect(result[0].replies[0].replies).toHaveLength(0);
    });

    it("returns empty array when all posts removed", () => {
      const posts: DiscussionPost[] = [createPost(1)];
      const result = removePostFromTree(posts, 1);
      expect(result).toHaveLength(0);
    });
  });
});
