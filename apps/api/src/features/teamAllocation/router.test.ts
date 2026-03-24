import { describe, expect, it } from "vitest";
import router from "./router.js";

const REQUIRED_ROUTES = [
  "/invites",
  "/invites/:inviteId/accept",
  "/teams/:teamId/invites",
  "/projects/:projectId/random-preview",
  "/projects/:projectId/custom-preview",
  "/projects/:projectId/allocation-drafts/:teamId",
  "/teams/:teamId/members",
];

describe("teamAllocation router", () => {
  it("registers key routes", () => {
    const routePaths = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => layer.route.path);
    for (const path of REQUIRED_ROUTES) {
      expect(routePaths).toContain(path);
    }
  });
});