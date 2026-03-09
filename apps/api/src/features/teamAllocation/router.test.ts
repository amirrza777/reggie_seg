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
        { path: "/teams/:teamId", methods: { get: true } },
        { path: "/teams/:teamId/members", methods: { post: true } },
        { path: "/teams/:teamId/members", methods: { get: true } },
      ])
    );
  });
});
