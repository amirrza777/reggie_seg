import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  handlers: {
    joinModuleHandler: vi.fn((_, res) => res.json({ ok: true })),
    getModuleJoinCodeHandler: vi.fn((_, res) => res.json({ moduleId: 1, joinCode: "ABCD2345" })),
    rotateModuleJoinCodeHandler: vi.fn((_, res) => res.json({ moduleId: 1, joinCode: "WXYZ6789" })),
  },
}));

vi.mock("../../auth/middleware.js", () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock("./controller.js", () => mockState.handlers);

import router from "./router.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/module-join", router);
  return app;
}

describe("moduleJoin router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers join/code/rotate endpoints", async () => {
    const app = createApp();
    await request(app).post("/module-join/join").send({ code: "ABCD2345" }).expect(200);
    await request(app).get("/module-join/modules/1/code").expect(200);
    await request(app).post("/module-join/modules/1/code/rotate").expect(200);

    expect(mockState.handlers.joinModuleHandler).toHaveBeenCalled();
    expect(mockState.handlers.getModuleJoinCodeHandler).toHaveBeenCalled();
    expect(mockState.handlers.rotateModuleJoinCodeHandler).toHaveBeenCalled();
  });

  it("rotate endpoint is POST-only", async () => {
    const app = createApp();
    await request(app).get("/module-join/modules/1/code/rotate").expect(404);
    await request(app).post("/module-join/modules/1/code/rotate").expect(200);
  });

  it("rate limits repeated join attempts", async () => {
    const app = createApp();
    let throttled: request.Response | null = null;
    for (let i = 0; i < 40; i += 1) {
      const response = await request(app).post("/module-join/join").send({ code: `ABCD${2000 + i}` });
      if (response.status === 429) {
        throttled = response;
        break;
      }
    }

    expect(throttled).not.toBeNull();
    expect(throttled?.headers["retry-after"]).toBeDefined();
    expect(throttled?.body).toEqual({ error: "Too many requests, please try again later." });
  });

  it("does not rate limit non-join routes", async () => {
    const app = createApp();
    for (let i = 0; i < 30; i += 1) {
      await request(app).get("/module-join/modules/1/code").expect(200);
      await request(app).post("/module-join/modules/1/code/rotate").expect(200);
    }
  });
});
