import { describe, expect, it } from "vitest";
import router from "./router.js";

describe("trello router", () => {
  it("registers expected routes", () => {
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({ path: layer.route.path, methods: layer.route.methods }));

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: "/link-token", methods: { get: true } },
        { path: "/me-member", methods: { get: true } },
        { path: "/me-profile", methods: { get: true } },
        { path: "/callback-with-link-token", methods: { post: true } },
        { path: "/assign", methods: { post: true } },
        { path: "/team-board", methods: { get: true } },
        { path: "/team-section-config", methods: { put: true } },
        { path: "/boards", methods: { get: true } },
        { path: "/boards/:boardId", methods: { get: true } },
        { path: "/connect-url", methods: { get: true } },
        { path: "/connect", methods: { get: true } },
        { path: "/callback", methods: { post: true } },
        { path: "/callback", methods: { get: true } },
      ]),
    );
  });
});
