import { describe, expect, it } from "vitest";
import type { DiscussionPost } from "@/features/forum/types";
import { normalizeReplyOrder } from "./DiscussionForumClient.tree";

describe("DiscussionForumClient.tree - Reply Normalization", () => {
  describe("normalizeReplyOrder", () => {
    const createPost = (id: number, reactionScore: number = 0, createdAt: string = "2026-01-01T00:00:00.000Z"): DiscussionPost => ({
      id,
      parentPostId: null,
      title: "Test",
      body: "Body",
      createdAt,
      updatedAt: createdAt,
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

    it("returns post unchanged if no replies", () => {
      const post = createPost(1);
      const result = normalizeReplyOrder(post);
      expect(result).toEqual(post);
    });

    it("sorts replies by score", () => {
      const post: DiscussionPost = {
        ...createPost(1),
        replies: [
          { ...createPost(2, 5), parentPostId: 1 },
          { ...createPost(3, 10), parentPostId: 1 },
          { ...createPost(4, 2), parentPostId: 1 },
        ],
      };

      const result = normalizeReplyOrder(post);
      expect(result.replies.map((r) => r.id)).toEqual([3, 2, 4]);
    });

    it("recursively normalizes nested replies", () => {
      const post: DiscussionPost = {
        ...createPost(1),
        replies: [
          {
            ...createPost(2, 5),
            parentPostId: 1,
            replies: [
              { ...createPost(4, 1), parentPostId: 2 },
              { ...createPost(5, 2), parentPostId: 2 },
            ],
          },
        ],
      };

      const result = normalizeReplyOrder(post);
      expect(result.replies[0].replies.map((r) => r.id)).toEqual([5, 4]);
    });
  });
});
