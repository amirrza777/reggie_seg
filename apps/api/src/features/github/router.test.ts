import { describe, expect, it } from "vitest";
import router from "./router.js";

describe("github router", () => {
  it("registers all routes correctly", () => {
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: layer.route.methods,
      }));

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: "/connect", methods: { get: true } },
        { path: "/callback", methods: { get: true } },
        { path: "/me", methods: { get: true } },
        { path: "/me", methods: { delete: true } },
        { path: "/repos", methods: { get: true } },
        { path: "/project-repos", methods: { post: true } },
        { path: "/project-repos/:linkId/analyse", methods: { post: true } },
        { path: "/project-repos/:linkId", methods: { delete: true } },
        { path: "/project-repos", methods: { get: true } },
        { path: "/project-repos/:linkId/snapshots", methods: { get: true } },
        { path: "/project-repos/:linkId/latest-snapshot", methods: { get: true } },
        { path: "/project-repos/:linkId/mapping-coverage", methods: { get: true } },
        { path: "/project-repos/:linkId/branches", methods: { get: true } },
        { path: "/project-repos/:linkId/branch-commits", methods: { get: true } },
        { path: "/project-repos/:linkId/my-commits", methods: { get: true } },
        { path: "/project-repos/:linkId/sync-settings", methods: { patch: true } },
        { path: "/snapshots/:snapshotId", methods: { get: true } },
      ])
    );
  });
});
