import { describe, expect, it } from "vitest";
import type { DiscussionPost } from "@/features/forum/types";
import { collectDescendantIds, findPostPath } from "./DiscussionForumClient.tree";

describe("DiscussionForumClient.tree - Tree Traversal", () => {
  describe("findPostPath", () => {
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

    it("finds path to root post", () => {
      const posts: DiscussionPost[] = [createPost(1)];
      const path = findPostPath(posts, 1);
      expect(path).toEqual([1]);
    });

    it("finds path to nested post", () => {
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

      const path = findPostPath(posts, 3);
      expect(path).toEqual([1, 2, 3]);
    });

    it("returns null when post not found", () => {
      const posts: DiscussionPost[] = [createPost(1)];
      const path = findPostPath(posts, 999);
      expect(path).toBeNull();
    });

    it("finds path in multiple root posts", () => {
      const posts: DiscussionPost[] = [
        createPost(1),
        { ...createPost(2), replies: [createPost(3)] },
        createPost(4),
      ];

      const path = findPostPath(posts, 3);
      expect(path).toEqual([2, 3]);
    });
  });

  describe("collectDescendantIds", () => {
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

    it("collects direct replies", () => {
      const post: DiscussionPost = {
        ...createPost(1),
        replies: [
          { ...createPost(2), parentPostId: 1 },
          { ...createPost(3), parentPostId: 1 },
        ],
      };

      const ids = collectDescendantIds(post);
      expect(ids).toContain(2);
      expect(ids).toContain(3);
      expect(ids).toHaveLength(2);
    });

    it("collects nested descendants", () => {
      const post: DiscussionPost = {
        ...createPost(1),
        replies: [
          {
            ...createPost(2),
            parentPostId: 1,
            replies: [
              { ...createPost(3), parentPostId: 2 },
              { ...createPost(4), parentPostId: 2 },
            ],
          },
        ],
      };

      const ids = collectDescendantIds(post);
      expect(ids).toContain(2);
      expect(ids).toContain(3);
      expect(ids).toContain(4);
      expect(ids).toHaveLength(3);
    });

    it("returns empty array for post with no replies", () => {
      const post = createPost(1);
      const ids = collectDescendantIds(post);
      expect(ids).toHaveLength(0);
    });
  });
});
