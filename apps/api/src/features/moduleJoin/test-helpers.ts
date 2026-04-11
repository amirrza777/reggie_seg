import type { Response } from "express";
import { vi } from "vitest";
import type { AuthRequest } from "../../auth/middleware.js";

export function createModuleJoinRequest(input: {
  userSub?: number;
  body?: unknown;
  moduleId?: string;
}): AuthRequest {
  const req = {
    ...(typeof input.userSub === "number" ? { user: { sub: input.userSub } } : {}),
    ...(input.body !== undefined ? { body: input.body } : {}),
    ...(input.moduleId !== undefined ? { params: { moduleId: input.moduleId } } : {}),
  };
  return req as unknown as AuthRequest;
}

export function createMockResponse() {
  const res: Partial<Response> = {};
  res.status = () => res as Response;
  res.json = () => res as Response;
  res.setHeader = () => res as Response;
  return {
    res: res as Response,
    statusSpy: vi.spyOn(res, "status"),
    jsonSpy: vi.spyOn(res, "json"),
    setHeaderSpy: vi.spyOn(res, "setHeader"),
  };
}
