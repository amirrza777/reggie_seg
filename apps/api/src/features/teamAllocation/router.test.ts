import { describe, expect, it } from "vitest";
import router from "./router.js";

describe("teamAllocation router", () => {
  it("registers all routes correctly", () => {
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: layer.route.methods,
      }));

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: "/invites", methods: { post: true } },
        { path: "/invites/:inviteId/accept", methods: { patch: true } },
        { path: "/invites/:inviteId/decline", methods: { patch: true } },
        { path: "/invites/:inviteId/reject", methods: { patch: true } },
        { path: "/invites/:inviteId/cancel", methods: { patch: true } },
        { path: "/invites/:inviteId/expire", methods: { patch: true } },
        { path: "/teams/:teamId/invites", methods: { get: true } },
        { path: "/teams", methods: { post: true } },
        { path: "/projects/:projectId/random-allocate", methods: { post: true } },
        { path: "/projects/:projectId/manual-allocate", methods: { post: true } },
        { path: "/projects/:projectId/random-preview", methods: { get: true } },
        { path: "/projects/:projectId/manual-workspace", methods: { get: true } },
        { path: "/projects/:projectId/allocation-drafts", methods: { get: true } },
        { path: "/projects/:projectId/allocation-drafts/:teamId", methods: { patch: true } },
        { path: "/projects/:projectId/allocation-drafts/:teamId/approve", methods: { patch: true } },
        { path: "/projects/:projectId/custom-questionnaires", methods: { get: true } },
        { path: "/projects/:projectId/custom-coverage", methods: { get: true } },
        { path: "/projects/:projectId/custom-preview", methods: { post: true } },
        { path: "/projects/:projectId/custom-allocate", methods: { post: true } },
        { path: "/teams/:teamId", methods: { get: true } },
        { path: "/teams/:teamId/members", methods: { post: true } },
        { path: "/teams/:teamId/members", methods: { get: true } },
      ])
    );
  });
});