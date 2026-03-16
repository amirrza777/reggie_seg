import { describe, expect, it } from "vitest";
import router from "./router.js";

describe("calendar router", () => {
  it("registers GET /events", () => {
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: layer.route.methods,
      }));

    expect(routes).toEqual(expect.arrayContaining([{ path: "/events", methods: { get: true } }]));
  });
});
