import express from "express";
import { vi } from "vitest";
import { healthHandler } from "./health";

// Mock questionnaires router to avoid hitting Prisma during health check
vi.mock("./features/questionnaires/router", () => {
  const router = express.Router();
  return { default: router };
});

import { app } from "./app";

describe("API health", () => {
  it("returns ok", async () => {
    const json = vi.fn();
    const res = { json } as any;

    healthHandler({} as any, res as any);

    expect(json).toHaveBeenCalledWith({ ok: true, message: "API is running" });
    expect(app).toBeDefined(); // ensure app module loads with mocked router
  });
});
