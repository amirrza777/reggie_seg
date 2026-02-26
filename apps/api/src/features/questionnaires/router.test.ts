import { describe, it, expect } from "vitest";
import router from "./router.js";

describe("template router", () => {
  it("registers all routes correctly", () => {
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: layer.route.methods,
      }));

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: "/", methods: { get: true } },
        { path: "/mine", methods: { get: true } },
        { path: "/public/others", methods: { get: true } },
        { path: "/new", methods: { post: true } },
        { path: "/:id", methods: { get: true } },
        { path: "/:id", methods: { put: true } },
        { path: "/:id", methods: { delete: true } },
      ])
    );
  });
});
