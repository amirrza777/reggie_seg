import { vi } from "vitest";
import type { Response } from "express";

vi.mock("../service.js", () => ({
  createTemplate: vi.fn(),
  getTemplate: vi.fn(),
  getAllTemplates: vi.fn(),
  getMyTemplates: vi.fn(),
  getPublicTemplatesFromOtherUsers: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  usePublicTemplate: vi.fn(),
}));

vi.mock("jsonwebtoken");
vi.mock("../../../auth/service.js", () => ({
  verifyRefreshToken: vi.fn(),
}));

export function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}
