import { describe, expect, it } from "vitest";
import {
  parseCreateDiscussionPostBody,
  parseForumSettingsBody,
  parseProjectPostUserBody,
  parseProjectReportUserBody,
  parseProjectUserPostQuery,
  parseProjectUserQuery,
  parseReactToDiscussionPostBody,
  parseUpdateDiscussionPostBody,
} from "./controller.parsers.js";

describe("forum controller parsers", () => {
  it("parses project/user query combinations", () => {
    expect(parseProjectUserQuery({ params: { projectId: "2" }, query: { userId: "1" } })).toEqual({
      ok: true,
      value: { userId: 1, projectId: 2 },
    });
    expect(
      parseProjectUserPostQuery({ params: { projectId: "2", postId: "3" }, query: { userId: "1" } }),
    ).toEqual({
      ok: true,
      value: { userId: 1, projectId: 2, postId: 3 },
    });
  });

  it("parses discussion post create and update payloads", () => {
    expect(parseCreateDiscussionPostBody({ userId: "1", title: " Hello ", body: " Body " })).toEqual({
      ok: true,
      value: { userId: 1, title: "Hello", body: "Body", parentPostId: null },
    });
    expect(parseCreateDiscussionPostBody({ userId: 1, body: " Reply ", parentPostId: "4" })).toEqual({
      ok: true,
      value: { userId: 1, title: "", body: "Reply", parentPostId: 4 },
    });
    expect(parseUpdateDiscussionPostBody({ userId: "1", title: " T ", body: " B " })).toEqual({
      ok: true,
      value: { userId: 1, title: "T", body: "B" },
    });
  });

  it("parses settings, reactions, and moderation payloads", () => {
    expect(parseForumSettingsBody({ userId: "2", forumIsAnonymous: true })).toEqual({
      ok: true,
      value: { userId: 2, forumIsAnonymous: true },
    });
    expect(
      parseReactToDiscussionPostBody({
        params: { projectId: "1", postId: "4" },
        body: { userId: "2", type: "LIKE" },
      }),
    ).toEqual({
      ok: true,
      value: { projectId: 1, postId: 4, userId: 2, type: "LIKE" },
    });
    expect(
      parseProjectPostUserBody({
        params: { projectId: "1", postId: "4" },
        body: { userId: "2", reason: " spam " },
      }),
    ).toEqual({
      ok: true,
      value: { projectId: 1, postId: 4, userId: 2, reason: "spam" },
    });
    expect(
      parseProjectReportUserBody({
        params: { projectId: "1", reportId: "5" },
        body: { userId: "2" },
      }),
    ).toEqual({
      ok: true,
      value: { projectId: 1, reportId: 5, userId: 2 },
    });
  });
});
