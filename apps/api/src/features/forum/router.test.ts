import { describe, expect, it } from "vitest";
import router from "./router.js";

describe("forum router", () => {
  it("registers discussion forum routes", () => {
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: layer.route.methods,
      }));

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: "/projects/:projectId/posts", methods: { get: true } },
        { path: "/projects/:projectId/posts", methods: { post: true } },
        { path: "/projects/:projectId/posts/:postId", methods: { get: true } },
        { path: "/projects/:projectId/posts/:postId", methods: { put: true } },
        { path: "/projects/:projectId/posts/:postId", methods: { delete: true } },
        { path: "/projects/:projectId/posts/:postId/report", methods: { post: true } },
        { path: "/projects/:projectId/posts/:postId/reactions", methods: { post: true } },
        { path: "/projects/:projectId/posts/:postId/conversation", methods: { get: true } },
        { path: "/projects/:projectId/posts/:postId/student-report", methods: { post: true } },
        { path: "/projects/:projectId/student-reports", methods: { get: true } },
        { path: "/projects/:projectId/student-reports/:reportId/approve", methods: { post: true } },
        { path: "/projects/:projectId/student-reports/:reportId/ignore", methods: { post: true } },
        { path: "/projects/:projectId/settings", methods: { get: true } },
        { path: "/projects/:projectId/settings", methods: { put: true } },
        { path: "/projects/:projectId/members", methods: { get: true } },
      ])
    );
  });
});
