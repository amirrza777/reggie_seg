import { describe, expect, it } from "vitest";
import router from "./router.js";

describe("peerAssessment/staff router", () => {
  it("registers all routes correctly", () => {
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: layer.route.methods,
      }));

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: "/modules", methods: { get: true } },
        { path: "/module/:moduleId", methods: { get: true } },
        { path: "/module/:moduleId/team/:teamId", methods: { get: true } },
        { path: "/module/:moduleId/team/:teamId/student/:studentId", methods: { get: true } },
      ])
    );
  });
});
