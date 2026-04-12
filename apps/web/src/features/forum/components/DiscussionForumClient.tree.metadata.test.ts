import { describe, expect, it } from "vitest";
import type { DiscussionPost } from "@/features/forum/types";
import { compareRepliesByScore, getAuthorRoleMeta } from "./DiscussionForumClient.tree";

describe("DiscussionForumClient.tree - Author Metadata", () => {
  describe("getAuthorRoleMeta", () => {
    it("returns STUDENT role meta", () => {
      const author = {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        role: "STUDENT" as const,
      };
      const meta = getAuthorRoleMeta(author);
      expect(meta.label).toBe("Student");
      expect(meta.variant).toBe("student");
    });

    it("returns STAFF role meta", () => {
      const author = {
        id: 1,
        firstName: "Jane",
        lastName: "Doe",
        role: "STAFF" as const,
      };
      const meta = getAuthorRoleMeta(author);
      expect(meta.label).toBe("Staff");
      expect(meta.variant).toBe("staff");
    });

    it("returns MODULE_LEAD role meta", () => {
      const author = {
        id: 1,
        firstName: "Bob",
        lastName: "Smith",
        role: "STAFF" as const,
        forumRole: "MODULE_LEAD" as const,
      };
      const meta = getAuthorRoleMeta(author);
      expect(meta.label).toBe("Module Lead");
      expect(meta.variant).toBe("module-lead");
    });

    it("returns TEACHING_ASSISTANT role meta", () => {
      const author = {
        id: 1,
        firstName: "Alice",
        lastName: "Wonder",
        role: "STAFF" as const,
        forumRole: "TEACHING_ASSISTANT" as const,
      };
      const meta = getAuthorRoleMeta(author);
      expect(meta.label).toBe("Teaching Assistant");
      expect(meta.variant).toBe("teaching-assistant");
    });

    it("returns ADMIN role meta", () => {
      const author = {
        id: 1,
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN" as const,
      };
      const meta = getAuthorRoleMeta(author);
      expect(meta.label).toBe("Admin");
      expect(meta.variant).toBe("admin");
    });

    it("returns ENTERPRISE_ADMIN role meta", () => {
      const author = {
        id: 1,
        firstName: "Enterprise",
        lastName: "Admin",
        role: "ENTERPRISE_ADMIN" as const,
      };
      const meta = getAuthorRoleMeta(author);
      expect(meta.label).toBe("Enterprise Admin");
      expect(meta.variant).toBe("enterprise-admin");
    });

    it("uses forumRole when provided instead of role", () => {
      const author = {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        role: "STUDENT" as const,
        forumRole: "STAFF" as const,
      };
      const meta = getAuthorRoleMeta(author);
      expect(meta.label).toBe("Staff");
      expect(meta.variant).toBe("staff");
    });
  });

  describe("compareRepliesByScore", () => {
    const createPost = (overrides: Partial<DiscussionPost> = {}): DiscussionPost => ({
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
      ...overrides,
    });

    it("sorts non-student posts before student posts", () => {
      const student = createPost({ id: 1, author: { ...createPost().author, role: "STUDENT" } });
      const staff = createPost({ id: 2, author: { ...createPost().author, role: "STAFF" } });

      expect(compareRepliesByScore(staff, student)).toBeLessThan(0);
      expect(compareRepliesByScore(student, staff)).toBeGreaterThan(0);
    });

    it("sorts by reaction score in descending order for same role", () => {
      const high = createPost({ id: 1, reactionScore: 10 });
      const low = createPost({ id: 2, reactionScore: 5 });

      expect(compareRepliesByScore(high, low)).toBeLessThan(0);
      expect(compareRepliesByScore(low, high)).toBeGreaterThan(0);
    });

    it("sorts by creation date when reaction scores are equal", () => {
      const older = createPost({ id: 1, createdAt: "2026-01-01T00:00:00.000Z" });
      const newer = createPost({ id: 2, createdAt: "2026-01-02T00:00:00.000Z" });

      expect(compareRepliesByScore(older, newer)).toBeLessThan(0);
      expect(compareRepliesByScore(newer, older)).toBeGreaterThan(0);
    });

    it("sorts by id when everything else is equal", () => {
      const a = createPost({ id: 1, createdAt: "2026-01-01T00:00:00.000Z", reactionScore: 0 });
      const b = createPost({ id: 2, createdAt: "2026-01-01T00:00:00.000Z", reactionScore: 0 });

      expect(compareRepliesByScore(a, b)).toBeLessThan(0);
      expect(compareRepliesByScore(b, a)).toBeGreaterThan(0);
    });
  });
});
