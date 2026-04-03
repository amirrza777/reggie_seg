import { describe, expect, it } from "vitest";
import {
  parseCreateDiscussionPostBody,
  parseForumSettingsBody,
  parsePostIdParam,
  parseProjectPostUserBody,
  parseProjectIdParam,
  parseProjectReportUserBody,
  parseProjectUserPostQuery,
  parseProjectUserQuery,
  parseReactToDiscussionPostBody,
  parseReportIdParam,
  parseUpdateDiscussionPostBody,
  parseUserIdQuery,
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

  it("rejects invalid id and query parsers", () => {
    expect(parseProjectIdParam("x")).toEqual({ ok: false, error: "Invalid project ID" });
    expect(parsePostIdParam("x")).toEqual({ ok: false, error: "Invalid post ID" });
    expect(parseReportIdParam("x")).toEqual({ ok: false, error: "Invalid report ID" });
    expect(parseUserIdQuery("x")).toEqual({ ok: false, error: "Invalid user ID" });
  });

  it("rejects invalid project/user/post combinations", () => {
    expect(parseProjectUserQuery({ params: { projectId: "x" }, query: { userId: "1" } })).toEqual({
      ok: false,
      error: "Invalid user ID or project ID",
    });
    expect(
      parseProjectUserPostQuery({ params: { projectId: "2", postId: "x" }, query: { userId: "1" } }),
    ).toEqual({
      ok: false,
      error: "Invalid user ID, project ID, or post ID",
    });
  });

  it("rejects invalid create/update/settings payloads", () => {
    expect(parseCreateDiscussionPostBody({ userId: "x", title: "A", body: "B" })).toEqual({
      ok: false,
      error: "Invalid user ID",
    });
    expect(parseCreateDiscussionPostBody({ userId: 1, body: "B", parentPostId: "x" })).toEqual({
      ok: false,
      error: "Invalid parent post ID",
    });
    expect(parseCreateDiscussionPostBody({ userId: 1, body: "B" })).toEqual({
      ok: false,
      error: "Title and body are required",
    });
    expect(parseCreateDiscussionPostBody({ userId: 1, title: "T", body: "" })).toEqual({
      ok: false,
      error: "Body is required",
    });
    expect(parseUpdateDiscussionPostBody({ userId: 1, title: " ", body: "x" })).toEqual({
      ok: false,
      error: "Title and body are required",
    });
    expect(parseForumSettingsBody({ userId: 2, forumIsAnonymous: "yes" })).toEqual({
      ok: false,
      error: "forumIsAnonymous must be boolean",
    });
  });

  it("rejects invalid reaction/report body combinations", () => {
    expect(
      parseProjectPostUserBody({ params: { projectId: "x", postId: "4" }, body: { userId: 1 } }),
    ).toEqual({
      ok: false,
      error: "Invalid project ID or post ID",
    });
    expect(
      parseProjectPostUserBody({ params: { projectId: "1", postId: "4" }, body: { userId: "x" } }),
    ).toEqual({
      ok: false,
      error: "Invalid user ID",
    });
    expect(
      parseProjectPostUserBody({ params: { projectId: "1", postId: "4" }, body: { userId: 1, reason: 9 } }),
    ).toEqual({
      ok: false,
      error: "Invalid reason",
    });

    expect(
      parseReactToDiscussionPostBody({ params: { projectId: "x", postId: "4" }, body: { userId: 1, type: "LIKE" } }),
    ).toEqual({
      ok: false,
      error: "Invalid project ID or post ID",
    });
    expect(
      parseReactToDiscussionPostBody({ params: { projectId: "1", postId: "x" }, body: { userId: 1, type: "LIKE" } }),
    ).toEqual({
      ok: false,
      error: "Invalid project ID or post ID",
    });
    expect(
      parseReactToDiscussionPostBody({ params: { projectId: "1", postId: "4" }, body: { userId: 1, type: "X" } }),
    ).toEqual({
      ok: false,
      error: "Invalid reaction type",
    });
    expect(
      parseProjectReportUserBody({ params: { projectId: "x", reportId: "4" }, body: { userId: 1 } }),
    ).toEqual({
      ok: false,
      error: "Invalid project ID or report ID",
    });
    expect(
      parseProjectReportUserBody({ params: { projectId: "1", reportId: "4" }, body: { userId: "x" } }),
    ).toEqual({
      ok: false,
      error: "Invalid user ID",
    });
  });
});
