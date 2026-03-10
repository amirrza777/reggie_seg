import { describe, expect, it } from "vitest";
import router from "./router.js";

describe("projects router", () => {
  it("registers all routes correctly", () => {
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: layer.route.methods,
      }));

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: "/", methods: { post: true } },
        { path: "/:projectId", methods: { get: true } },
        { path: "/", methods: { get: true } },
        { path: "/:projectId/teammates", methods: { get: true } },
        { path: "/:projectId/deadline", methods: { get: true } },
        { path: "/:projectId/team", methods: { get: true } },
        { path: "/teams/:teamId", methods: { get: true } },
        { path: "/:projectId/questions", methods: { get: true } },
      ])
    );
  });
});
