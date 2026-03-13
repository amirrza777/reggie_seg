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
        { path: "/:projectId/team-health-messages", methods: { post: true } },
        { path: "/:projectId/team-health-messages/me", methods: { get: true } },
        { path: "/:projectId/team", methods: { get: true } },
        { path: "/staff/:projectId/teams/:teamId/team-health-messages", methods: { get: true } },
        { path: "/staff/:projectId/teams/:teamId/deadline", methods: { get: true } },
        { path: "/staff/:projectId/teams/:teamId/team-health-messages/:requestId/review", methods: { patch: true } },
        {
          path: "/staff/:projectId/teams/:teamId/team-health-messages/:requestId/deadline-override",
          methods: { post: true },
        },
        { path: "/teams/:teamId", methods: { get: true } },
        { path: "/:projectId/questions", methods: { get: true } },
      ])
    );
  });
});
