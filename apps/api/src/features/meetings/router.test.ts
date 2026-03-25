import { describe, it, expect } from "vitest";
import router from "./router.js";

describe("meetings router", () => {
  it("registers all routes correctly", () => {
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: layer.route.methods,
      }));

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: "/team/:teamId", methods: { get: true } },
        { path: "/:meetingId", methods: { get: true } },
        { path: "/", methods: { post: true } },
        { path: "/:meetingId", methods: { delete: true } },
        { path: "/:meetingId", methods: { patch: true } },
        { path: "/:meetingId/attendance", methods: { put: true } },
        { path: "/:meetingId/minutes", methods: { put: true } },
        { path: "/:meetingId/minutes", methods: { get: true } },
        { path: "/:meetingId/comments", methods: { post: true } },
        { path: "/comments/:commentId", methods: { delete: true } },
        { path: "/:meetingId/settings", methods: { get: true } },
      ])
    );
  });
});
