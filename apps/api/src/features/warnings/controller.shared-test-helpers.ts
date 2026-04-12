import { vi } from "vitest";
import type { Response } from "express";

vi.mock("./service.js", () => ({
  createTeamWarningForStaff: vi.fn(),
  evaluateProjectWarningsForStaff: vi.fn(),
  fetchMyTeamWarnings: vi.fn(),
  fetchProjectWarningsConfigForStaff: vi.fn(),
  fetchTeamWarningsForStaff: vi.fn(),
  resolveTeamWarningForStaff: vi.fn(),
  updateProjectWarningsConfigForStaff: vi.fn(),
}));

export function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

export * as service from "./service.js";
export {
  createStaffTeamWarningHandler,
  evaluateProjectWarningsHandler,
  getMyTeamWarningsHandler,
  getProjectWarningsConfigHandler,
  getStaffTeamWarningsHandler,
  resolveStaffTeamWarningHandler,
  updateProjectWarningsConfigHandler,
} from "./controller.js";
