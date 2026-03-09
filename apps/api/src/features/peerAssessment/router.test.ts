import { describe, expect, it } from "vitest";
import router from "./router.js";

describe("peerAssessment router", () => {
  it("registers all routes correctly", () => {
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: layer.route.methods,
      }));

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: "/teams/:teamId/teammates", methods: { get: true } },
        { path: "/", methods: { post: true } },
        { path: "/", methods: { get: true } },
        { path: "/:id", methods: { put: true } },
        { path: "/projects/:projectId/questions", methods: { get: true } },
        { path: "/projects/:projectId/user/:userId", methods: { get: true } },
        { path: "/:id", methods: { get: true } },
      ])
    );
  });
});
